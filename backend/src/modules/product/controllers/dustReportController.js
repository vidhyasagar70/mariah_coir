import { dbQuery } from '../../../config/db.js';

// GET /api/dust/reports/customer-summary
export async function getCustomerSummaryReport(req, res) {
  try {
    const { search, status, date_from, date_to } = req.query;

    let query = `
      SELECT 
        dc.id,
        dc.customer_name,
        dc.phone_number,
        dc.company_name,
        dc.preferred_vehicle_type,
        dc.advance_amount_paid,
        dc.current_advance_balance as remaining_advance_held,
        dc.advance_date,
        dc.delivery_due_date,
        dc.queue_status,
        COALESCE(SUM(ds.total_sale_amount), 0) as total_dispatched_value,
        COALESCE(SUM(ds.remaining_balance_due), 0) as payment_due_outstanding,
        COUNT(ds.id) as total_dispatches_count
      FROM dust_customers dc
      LEFT JOIN dust_sales ds ON dc.id = ds.customer_id
      WHERE 1=1`;

    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (dc.customer_name LIKE $${pIdx} OR dc.phone_number LIKE $${pIdx} OR dc.company_name LIKE $${pIdx} OR dc.id LIKE $${pIdx})`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND dc.advance_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND dc.advance_date <= $${params.length}`;
    }

    query += ` GROUP BY dc.id, dc.customer_name, dc.phone_number, dc.company_name, dc.preferred_vehicle_type, dc.advance_amount_paid, dc.current_advance_balance, dc.advance_date, dc.delivery_due_date, dc.queue_status`;
    query += ` ORDER BY dc.created_at DESC, dc.id DESC`;

    const rows = await dbQuery(query, params);

    // Process account status and filter by status if requested
    const processedReport = rows.map(r => {
      const remainingAdv = parseFloat(r.remaining_advance_held) || 0;
      const paymentDue = parseFloat(r.payment_due_outstanding) || 0;

      let account_status = 'Settled';
      if (remainingAdv > 0) {
        account_status = 'Advance Available';
      } else if (paymentDue > 0) {
        account_status = 'Payment Due';
      }

      return {
        ...r,
        initial_advance_paid: parseFloat(r.advance_amount_paid) || 0,
        remaining_advance_held: remainingAdv,
        total_dispatched_value: parseFloat(r.total_dispatched_value) || 0,
        payment_due_outstanding: paymentDue,
        total_dispatches_count: parseInt(r.total_dispatches_count, 10) || 0,
        account_status
      };
    });

    let filteredReport = processedReport;
    if (status && status !== 'ALL') {
      if (status === 'ADVANCE_HELD') {
        filteredReport = processedReport.filter(r => r.account_status === 'Advance Available');
      } else if (status === 'PAYMENT_DUE') {
        filteredReport = processedReport.filter(r => r.account_status === 'Payment Due');
      } else if (status === 'SETTLED') {
        filteredReport = processedReport.filter(r => r.account_status === 'Settled');
      }
    }

    // Global KPI Summary calculation
    const summary = {
      totalAdvanceHeld: processedReport.reduce((acc, r) => acc + r.remaining_advance_held, 0),
      totalPaymentDue: processedReport.reduce((acc, r) => acc + r.payment_due_outstanding, 0),
      totalDispatchedValue: processedReport.reduce((acc, r) => acc + r.total_dispatched_value, 0),
      activeQueueCount: processedReport.filter(r => r.queue_status === 'In Queue' || r.queue_status === 'Partial Delivered' || r.remaining_advance_held > 0).length
    };

    res.json({ report: filteredReport, summary });
  } catch (error) {
    console.error('Error generating dust customer summary report:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/dust/reports/customer-ledger/:customerId
export async function getCustomerLedgerStatement(req, res) {
  try {
    const { customerId } = req.params;

    const customerRows = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [customerId]);
    if (customerRows.length === 0) {
      return res.status(404).json({ error: `Dust Customer ${customerId} not found.` });
    }

    const customer = customerRows[0];
    const initialAdv = parseFloat(customer.advance_amount_paid) || 0;

    // Fetch dispatches
    const dispatches = await dbQuery(
      `SELECT ds.*, dm.dust_name 
       FROM dust_sales ds
       LEFT JOIN dust_master dm ON ds.dust_id = dm.id
       WHERE ds.customer_id = $1 
       ORDER BY ds.dispatch_date ASC, ds.created_at ASC`,
      [customerId]
    );

    // Build chronological transaction statement
    const statementEntries = [];
    let runningAdvanceBal = initialAdv;
    let runningDueBal = 0;

    // Entry 1: Initial Advance Payment
    statementEntries.push({
      entry_id: `ADV-${customer.id}`,
      date: customer.advance_date,
      type: 'ADVANCE_DEPOSIT',
      title: 'Advance Deposit Received',
      description: `Initial advance collected via ${customer.preferred_vehicle_type} order queue`,
      credit_amount: initialAdv,
      debit_amount: 0,
      running_advance_balance: runningAdvanceBal,
      running_due_balance: runningDueBal,
      reference_id: customer.id
    });

    // Subsequent Entries: Dispatches
    for (const d of dispatches) {
      const saleAmt = parseFloat(d.total_sale_amount) || 0;
      const deducted = parseFloat(d.amount_deducted_from_advance) || 0;
      const dueAmt = parseFloat(d.remaining_balance_due) || 0;

      runningAdvanceBal = Math.max(0, runningAdvanceBal - deducted);
      runningDueBal += dueAmt;

      statementEntries.push({
        entry_id: d.id,
        date: d.dispatch_date,
        type: 'MATERIAL_DISPATCH',
        title: `Dust Load Dispatch (${d.loads_count} load/s)`,
        description: `${d.dust_name || d.vehicle_type} delivered by ${d.vehicle_number} @ ₹${d.rate_per_load}/load`,
        credit_amount: 0,
        debit_amount: saleAmt,
        amount_deducted_from_advance: deducted,
        remaining_balance_due: dueAmt,
        running_advance_balance: runningAdvanceBal,
        running_due_balance: runningDueBal,
        reference_id: d.id
      });
    }

    res.json({
      customer: {
        ...customer,
        advance_amount_paid: initialAdv,
        current_advance_balance: parseFloat(customer.current_advance_balance) || 0
      },
      statementEntries,
      summary: {
        totalInitialAdvance: initialAdv,
        totalDispatchedValue: dispatches.reduce((acc, d) => acc + (parseFloat(d.total_sale_amount) || 0), 0),
        currentAdvanceBalance: parseFloat(customer.current_advance_balance) || 0,
        totalOutstandingDue: dispatches.reduce((acc, d) => acc + (parseFloat(d.remaining_balance_due) || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error generating customer ledger statement:', error);
    res.status(500).json({ error: error.message });
  }
}
