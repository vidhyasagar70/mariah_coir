import { dbQuery, generateUuid } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// POST /api/supplier-management/accounts/transaction
export async function recordTransaction(req, res) {
  try {
    const {
      supplier_id, transaction_date, transaction_type, amount, description,
      reference_type, reference_id
    } = req.body;

    if (!supplier_id) return res.status(400).json({ error: 'Supplier is required.' });
    if (!transaction_type) return res.status(400).json({ error: 'Transaction type is required.' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than zero.' });

    const numAmount = parseFloat(amount);
    const date = transaction_date || new Date().toISOString().split('T')[0];

    // Determine debit vs credit
    // Debit = Money given/paid to supplier or amount owed by supplier
    // Credit = Value of supply received or credit owed to supplier
    let debit = 0;
    let credit = 0;

    switch (transaction_type) {
      case 'ADVANCE_GIVEN':
      case 'SETTLEMENT':
      case 'SUPPLIER_DEBIT':
        debit = numAmount;
        break;
      case 'SUPPLY_PAYABLE':
      case 'SUPPLIER_CREDIT':
        credit = numAmount;
        break;
      case 'ADVANCE_ADJUSTMENT':
      case 'MANUAL_ADJUSTMENT':
        // Adjustment reduces advance (credit side adjustment)
        debit = numAmount;
        break;
      default:
        debit = numAmount;
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO supplier_account_transactions (id, company_id, supplier_id, transaction_date, transaction_type, reference_type, reference_id, debit, credit, amount, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id, COMPANY_ID, supplier_id, date, transaction_type,
        reference_type || null, reference_id || null,
        debit, credit, numAmount, description || '', COMPANY_ID
      ]
    );

    const created = await dbQuery(`SELECT * FROM supplier_account_transactions WHERE id = $1`, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error recording account transaction:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/accounts/:supplierId/balance
export async function getSupplierBalance(req, res) {
  try {
    const { supplierId } = req.params;

    const rows = await dbQuery(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'ADVANCE_GIVEN' THEN amount ELSE 0 END), 0) as total_advance_given,
        COALESCE(SUM(CASE WHEN transaction_type = 'ADVANCE_ADJUSTMENT' THEN amount ELSE 0 END), 0) as total_advance_used,
        COALESCE(SUM(CASE WHEN transaction_type = 'SUPPLY_PAYABLE' THEN amount ELSE 0 END), 0) as total_supply_value,
        COALESCE(SUM(CASE WHEN transaction_type = 'SETTLEMENT' THEN amount ELSE 0 END), 0) as total_settled,
        COALESCE(SUM(CASE WHEN transaction_type = 'SUPPLIER_CREDIT' THEN amount ELSE 0 END), 0) as total_supplier_credit,
        COALESCE(SUM(CASE WHEN transaction_type = 'SUPPLIER_DEBIT' THEN amount ELSE 0 END), 0) as total_supplier_debit,
        COALESCE(SUM(debit), 0) as grand_total_debit,
        COALESCE(SUM(credit), 0) as grand_total_credit
      FROM supplier_account_transactions
      WHERE supplier_id = $1 AND company_id = $2
    `, [supplierId, COMPANY_ID]);

    const stats = rows[0] || {};
    const totalAdvanceGiven = parseFloat(stats.total_advance_given || 0);
    const totalAdvanceUsed = parseFloat(stats.total_advance_used || 0);
    const availableAdvance = Math.max(0, totalAdvanceGiven - totalAdvanceUsed);
    const totalSupplyValue = parseFloat(stats.total_supply_value || 0);
    const totalSettled = parseFloat(stats.total_settled || 0);
    const supplierCredit = parseFloat(stats.total_supplier_credit || 0);
    const supplierDebit = parseFloat(stats.total_supplier_debit || 0);

    const outstandingPayable = Math.max(0, (totalSupplyValue + supplierCredit) - (totalAdvanceUsed + totalSettled));

    res.json({
      supplier_id: supplierId,
      total_advance_given: totalAdvanceGiven,
      total_advance_used: totalAdvanceUsed,
      available_advance: availableAdvance,
      total_supply_value: totalSupplyValue,
      total_settled: totalSettled,
      supplier_credit: supplierCredit,
      supplier_debit: supplierDebit,
      outstanding_payable: outstandingPayable,
      net_balance: availableAdvance - outstandingPayable - supplierDebit
    });
  } catch (error) {
    console.error('Error fetching supplier balance:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/accounts/:supplierId/ledger
export async function getSupplierLedger(req, res) {
  try {
    const { supplierId } = req.params;
    const { from_date, to_date } = req.query;

    let query = `
      SELECT sat.*, s.supplier_name, s.supplier_number
      FROM supplier_account_transactions sat
      LEFT JOIN suppliers s ON sat.supplier_id = s.id
      WHERE sat.supplier_id = $1 AND sat.company_id = $2`;
    const params = [supplierId, COMPANY_ID];

    if (from_date) {
      params.push(from_date);
      query += ` AND sat.transaction_date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND sat.transaction_date <= $${params.length}`;
    }

    query += ` ORDER BY sat.transaction_date ASC, sat.created_at ASC`;
    const transactions = await dbQuery(query, params);

    // Compute running balance
    let runningBalance = 0;
    const ledgerWithRunning = transactions.map(tx => {
      const db = parseFloat(tx.debit || 0);
      const cr = parseFloat(tx.credit || 0);

      if (tx.transaction_type === 'ADVANCE_GIVEN') {
        runningBalance += db; // Advance is positive asset for company (or supplier advance credit)
      } else if (tx.transaction_type === 'SUPPLY_PAYABLE') {
        runningBalance -= cr; // Supply payable reduces advance / creates payable
      } else if (tx.transaction_type === 'ADVANCE_ADJUSTMENT') {
        // Adjusts advance
      } else if (tx.transaction_type === 'SETTLEMENT') {
        runningBalance += db;
      }
      return {
        ...tx,
        running_balance: runningBalance
      };
    });

    res.json({ data: ledgerWithRunning, total: ledgerWithRunning.length });
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/accounts/:supplierId
export async function getAccountBySupplier(req, res) {
  return getSupplierBalance(req, res);
}
