import { dbQuery, getNextId } from '../../../config/db.js';

// GET /api/dust/sales
export async function getDustSales(req, res) {
  try {
    const { search, customer_id, payment_status } = req.query;

    let query = `
      SELECT ds.*, 
             dc.customer_name, dc.phone_number, dc.company_name, dc.current_advance_balance as customer_advance_balance,
             dm.dust_name, dm.custom_vehicle_name
      FROM dust_sales ds
      LEFT JOIN dust_customers dc ON ds.customer_id = dc.id
      LEFT JOIN dust_master dm ON ds.dust_id = dm.id
      WHERE 1=1`;
    
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (ds.id LIKE $${pIdx} OR ds.vehicle_number LIKE $${pIdx} OR dc.customer_name LIKE $${pIdx} OR dm.dust_name LIKE $${pIdx})`;
    }

    if (customer_id && customer_id !== 'All') {
      params.push(customer_id);
      query += ` AND ds.customer_id = $${params.length}`;
    }

    if (payment_status && payment_status !== 'All') {
      params.push(payment_status);
      query += ` AND ds.payment_status = $${params.length}`;
    }

    query += ` ORDER BY ds.dispatch_date DESC, ds.id DESC`;

    const sales = await dbQuery(query, params);
    const allSales = await dbQuery(`SELECT total_sale_amount, amount_deducted_from_advance, remaining_balance_due, loads_count FROM dust_sales`);

    const summary = {
      totalDispatches: allSales.length,
      totalLoadsCount: allSales.reduce((acc, s) => acc + (parseInt(s.loads_count, 10) || 0), 0),
      totalSalesAmount: allSales.reduce((acc, s) => acc + (parseFloat(s.total_sale_amount) || 0), 0),
      totalDeductedFromAdvance: allSales.reduce((acc, s) => acc + (parseFloat(s.amount_deducted_from_advance) || 0), 0),
      totalRemainingDue: allSales.reduce((acc, s) => acc + (parseFloat(s.remaining_balance_due) || 0), 0)
    };

    res.json({ sales, summary });
  } catch (error) {
    console.error('Error fetching dust sales:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/dust/sales/:id
export async function getDustSaleById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`
      SELECT ds.*, dc.customer_name, dc.company_name, dm.dust_name
      FROM dust_sales ds
      LEFT JOIN dust_customers dc ON ds.customer_id = dc.id
      LEFT JOIN dust_master dm ON ds.dust_id = dm.id
      WHERE ds.id = $1`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Dust Sales record ${id} not found.` });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching dust sale by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/dust/sales
export async function createDustSale(req, res) {
  try {
    const {
      customer_id,
      dust_id,
      vehicle_type,
      vehicle_number,
      dispatch_date,
      loads_count,
      rate_per_load
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'Customer selection is required.' });
    }

    if (!vehicle_type || !vehicle_type.trim()) {
      return res.status(400).json({ error: 'Vehicle type is required.' });
    }

    if (!vehicle_number || !vehicle_number.trim()) {
      return res.status(400).json({ error: 'Vehicle registration number is required.' });
    }

    const loadsCountNum = parseInt(loads_count, 10);
    if (isNaN(loadsCountNum) || loadsCountNum < 1) {
      return res.status(400).json({ error: 'Loads count must be a positive integer (at least 1).' });
    }

    const rateNum = parseFloat(rate_per_load);
    if (isNaN(rateNum) || rateNum <= 0) {
      return res.status(400).json({ error: 'Rate per load must be a positive number.' });
    }

    // Verify Customer exists and check current advance balance
    const customerRows = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [customer_id]);
    if (customerRows.length === 0) {
      return res.status(404).json({ error: `Selected customer ${customer_id} does not exist.` });
    }
    const customer = customerRows[0];
    const currentAdvBalance = parseFloat(customer.current_advance_balance) || 0;

    const totalSaleAmount = loadsCountNum * rateNum;
    const amountDeductedFromAdvance = Math.min(currentAdvBalance, totalSaleAmount);
    const remainingBalanceDue = totalSaleAmount - amountDeductedFromAdvance;

    let paymentStatus = 'Deducted from Advance';
    if (remainingBalanceDue > 0 && amountDeductedFromAdvance === 0) {
      paymentStatus = 'Payment Due';
    } else if (remainingBalanceDue > 0 && amountDeductedFromAdvance > 0) {
      paymentStatus = 'Payment Due';
    } else if (remainingBalanceDue === 0) {
      paymentStatus = 'Deducted from Advance';
    }

    const newAdvanceBalance = Math.max(0, currentAdvBalance - amountDeductedFromAdvance);

    let newQueueStatus = 'Partial Delivered';
    if (newAdvanceBalance <= 0) {
      newQueueStatus = 'Completed';
    }

    const newId = await getNextId('DSLE');
    const dispDate = dispatch_date || new Date().toISOString().split('T')[0];

    // Insert sale record
    await dbQuery(
      `INSERT INTO dust_sales 
       (id, customer_id, dust_id, vehicle_type, vehicle_number, dispatch_date, loads_count, rate_per_load, total_sale_amount, amount_deducted_from_advance, remaining_balance_due, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        newId,
        customer_id,
        dust_id || null,
        vehicle_type.trim(),
        vehicle_number.trim().toUpperCase(),
        dispDate,
        loadsCountNum,
        rateNum,
        totalSaleAmount,
        amountDeductedFromAdvance,
        remainingBalanceDue,
        paymentStatus
      ]
    );

    // Update customer advance balance & queue status
    await dbQuery(
      `UPDATE dust_customers
       SET current_advance_balance = $1, queue_status = $2
       WHERE id = $3`,
      [newAdvanceBalance, newQueueStatus, customer_id]
    );

    const created = await dbQuery(`
      SELECT ds.*, dc.customer_name, dc.company_name, dm.dust_name
      FROM dust_sales ds
      LEFT JOIN dust_customers dc ON ds.customer_id = dc.id
      LEFT JOIN dust_master dm ON ds.dust_id = dm.id
      WHERE ds.id = $1`, [newId]);

    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating dust sale dispatch:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/dust/sales/:id
export async function deleteDustSale(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM dust_sales WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Dust Sales record ${id} not found.` });
    }

    const sale = existing[0];
    const deductedAmt = parseFloat(sale.amount_deducted_from_advance) || 0;

    // Revert deducted amount back to customer advance balance
    if (sale.customer_id && deductedAmt > 0) {
      const custRows = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [sale.customer_id]);
      if (custRows.length > 0) {
        const cust = custRows[0];
        const revertedBalance = (parseFloat(cust.current_advance_balance) || 0) + deductedAmt;
        const revertedStatus = revertedBalance > 0 ? 'Partial Delivered' : cust.queue_status;

        await dbQuery(
          `UPDATE dust_customers
           SET current_advance_balance = $1, queue_status = $2
           WHERE id = $3`,
          [revertedBalance, revertedStatus, sale.customer_id]
        );
      }
    }

    await dbQuery(`DELETE FROM dust_sales WHERE id = $1`, [id]);
    res.json({ success: true, message: `Dust Sales dispatch ${id} deleted and advance balance reverted.` });
  } catch (error) {
    console.error('Error deleting dust sale:', error);
    res.status(500).json({ error: error.message });
  }
}
