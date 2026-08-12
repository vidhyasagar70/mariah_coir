import { dbQuery, getNextId, generateUuid } from '../config/db.js';

export async function getSettlements(req, res) {
  try {
    const { supplier_id } = req.query;
    let query = `
      SELECT st.*, s.name as supplier_name, s.company_name
      FROM settlements st
      JOIN suppliers s ON st.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id && supplier_id !== 'All') {
      params.push(supplier_id);
      query += ` AND st.supplier_id = $${params.length}`;
    }

    query += ` ORDER BY st.settlement_date DESC, st.created_at DESC`;

    const settlements = await dbQuery(query, params);
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createSettlement(req, res) {
  try {
    const { supplier_id, settlement_date, settlement_type, amount_paid, linked_invoices, note } = req.body;

    if (!supplier_id || !amount_paid || parseFloat(amount_paid) <= 0) {
      return res.status(400).json({ error: 'Supplier ID and a positive settlement payment amount are required.' });
    }

    const sId = await getNextId('STL');
    const sDate = settlement_date || new Date().toISOString().split('T')[0];
    const paid = parseFloat(amount_paid);
    const invoices = Array.isArray(linked_invoices) ? linked_invoices : [];

    // Calculate total of selected linked receipts
    let totalSelectedUnpaid = 0;
    if (invoices.length > 0) {
      for (const rId of invoices) {
        const rows = await dbQuery('SELECT total_amount FROM receipts WHERE id = $1', [rId]);
        if (rows.length > 0) {
          totalSelectedUnpaid += parseFloat(rows[0].total_amount);
        }
      }
    } else {
      // Fallback: sum all pending receipts for supplier
      const pendingRows = await dbQuery(
        `SELECT total_amount FROM receipts WHERE supplier_id = $1 AND status IN ('Pending', 'Partial')`,
        [supplier_id]
      );
      pendingRows.forEach(r => totalSelectedUnpaid += parseFloat(r.total_amount));
    }

    const remaining_balance = Math.max(0, totalSelectedUnpaid - paid);

    // Save Settlement record
    await dbQuery(
      `INSERT INTO settlements (id, supplier_id, settlement_date, settlement_type, amount_paid, remaining_balance, linked_invoices)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sId, supplier_id, sDate, settlement_type || 'Partial', paid, remaining_balance, invoices]
    );

    // Update status of linked receipts
    for (const rId of invoices) {
      const statusToSet = (settlement_type === 'Full Settlement') ? 'Settled' : 'Partial';
      await dbQuery(
        `UPDATE receipts SET status = $1 WHERE id = $2`,
        [statusToSet, rId]
      );
    }

    // Add entry into Payment Ledger (Advance Paid / Owner Paid)
    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, 'Advance Paid', $4, 'Owner Paid', $5)`,
      [
        generateUuid(),
        supplier_id,
        sDate,
        paid,
        `Account Settlement ${sId} (${settlement_type || 'Partial'}) - ${note || 'Linked Invoices: ' + invoices.join(', ')}`
      ]
    );

    res.status(201).json({
      id: sId,
      remaining_balance,
      message: `Account Settlement ${sId} recorded successfully.`
    });
  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({ error: error.message });
  }
}
