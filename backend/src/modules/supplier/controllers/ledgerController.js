import { dbQuery, generateUuid } from '../../../config/db.js';

export async function getLedgerTransactions(req, res) {
  try {
    const { supplier_id } = req.query;
    let query = `
      SELECT l.*, s.name as supplier_name, s.company_name
      FROM supplier_ledger l
      JOIN suppliers s ON l.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id && supplier_id !== 'All') {
      params.push(supplier_id);
      query += ` AND l.supplier_id = $${params.length}`;
    }

    query += ` ORDER BY l.transaction_date DESC, l.created_at DESC`;

    const transactions = await dbQuery(query, params);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createLedgerEntry(req, res) {
  try {
    const { supplier_id, transaction_date, transaction_type, amount, note } = req.body;

    if (!supplier_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Supplier ID and a positive transaction amount are required.' });
    }

    const tDate = transaction_date || new Date().toISOString().split('T')[0];
    const tType = transaction_type === 'Delivery Due' ? 'Delivery Due' : 'Advance Paid';
    const balanceImpact = tType === 'Delivery Due' ? 'Owner Owes' : 'Owner Paid';
    const uuid = generateUuid();

    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuid, supplier_id, tDate, tType, parseFloat(amount), balanceImpact, note || null]
    );

    res.status(201).json({ id: uuid, message: 'Ledger transaction recorded successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getLedgerSummary(req, res) {
  try {
    const { supplierId } = req.params;
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN balance_impact = 'Owner Owes' THEN amount ELSE 0 END), 0) as total_payable,
        COALESCE(SUM(CASE WHEN balance_impact = 'Owner Paid' THEN amount ELSE 0 END), 0) as total_advance_held
      FROM supplier_ledger
    `;
    const params = [];
    if (supplierId && supplierId !== 'All') {
      params.push(supplierId);
      query += ` WHERE supplier_id = $1`;
    }

    const result = await dbQuery(query, params);
    const totalPayable = parseFloat(result[0]?.total_payable || 0);
    const totalAdvanceHeld = parseFloat(result[0]?.total_advance_held || 0);
    const netBalanceDue = totalPayable - totalAdvanceHeld;

    res.json({
      totalPayable,
      totalAdvanceHeld,
      netBalanceDue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
