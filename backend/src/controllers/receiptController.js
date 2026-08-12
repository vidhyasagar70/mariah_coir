import { dbQuery, getNextId, generateUuid } from '../config/db.js';

export async function getReceipts(req, res) {
  try {
    const { supplier_id, material_type, status, date_from, date_to, search } = req.query;
    let query = `
      SELECT r.*, s.name as supplier_name, s.company_name, s.category as supplier_category
      FROM receipts r
      JOIN suppliers s ON r.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id && supplier_id !== 'All') {
      params.push(supplier_id);
      query += ` AND r.supplier_id = $${params.length}`;
    }

    if (material_type && material_type !== 'All') {
      params.push(material_type);
      query += ` AND r.material_type = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND r.receipt_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND r.receipt_date <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.id LIKE $${params.length} OR s.name LIKE $${params.length} OR r.vehicle_type LIKE $${params.length})`;
    }

    query += ` ORDER BY r.receipt_date DESC, r.created_at DESC`;

    const receipts = await dbQuery(query, params);
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getPendingReceiptsBySupplier(req, res) {
  try {
    const { supplierId } = req.params;
    const receipts = await dbQuery(
      `SELECT r.*, s.name as supplier_name 
       FROM receipts r
       JOIN suppliers s ON r.supplier_id = s.id
       WHERE r.supplier_id = $1 AND r.status IN ('Pending', 'Partial')
       ORDER BY r.receipt_date ASC, r.created_at ASC`,
      [supplierId]
    );
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createReceipt(req, res) {
  try {
    const { supplier_id, material_type, vehicle_type, receipt_date, trip_count, rate_per_trip } = req.body;

    if (!supplier_id || !material_type || !vehicle_type || !trip_count || rate_per_trip === undefined) {
      return res.status(400).json({ error: 'All receipt fields are required.' });
    }

    const id = await getNextId('RCT');
    const trips = parseInt(trip_count, 10);
    const rate = parseFloat(rate_per_trip);
    const total_amount = trips * rate;
    const rDate = receipt_date || new Date().toISOString().split('T')[0];

    // Insert Receipt Record
    await dbQuery(
      `INSERT INTO receipts (id, supplier_id, material_type, vehicle_type, receipt_date, trip_count, rate_per_trip, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')`,
      [id, supplier_id, material_type, vehicle_type, rDate, trips, rate, total_amount]
    );

    // Auto-post to Payment Ledger (Delivery Due, Owner Owes)
    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, 'Delivery Due', $4, 'Owner Owes', $5)`,
      [
        generateUuid(),
        supplier_id,
        rDate,
        total_amount,
        `Goods Inward Receipt ${id} - ${trips} trip(s) of ${material_type} via ${vehicle_type}`
      ]
    );

    res.status(201).json({ id, total_amount, message: 'Material receipt recorded and posted to ledger.' });
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: error.message });
  }
}
