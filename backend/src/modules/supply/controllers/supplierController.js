import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/suppliers
export async function getSuppliers(req, res) {
  try {
    const { search, status } = req.query;
    let query = `SELECT * FROM supply_suppliers WHERE deleted_at IS NULL`;
    const params = [];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name LIKE $${params.length} OR supplier_code LIKE $${params.length} OR contact_person LIKE $${params.length} OR phone LIKE $${params.length})`;
    }

    query += ` ORDER BY supplier_code ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supply/suppliers/:id
export async function getSupplierById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM supply_suppliers WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/suppliers
export async function createSupplier(req, res) {
  try {
    const { name, contact_person, phone, address } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required.' });
    }

    // Auto-generate supplier code
    const existing = await dbQuery(`SELECT supplier_code FROM supply_suppliers ORDER BY created_at DESC LIMIT 1`);
    let nextNum = 1;
    if (existing.length > 0 && existing[0].supplier_code) {
      const numPart = parseInt(existing[0].supplier_code.replace('SSUP-', ''), 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }
    const supplier_code = `SSUP-${String(nextNum).padStart(3, '0')}`;

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO supply_suppliers (id, supplier_code, name, contact_person, phone, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, supplier_code, name.trim(), contact_person || '', phone || '', address || '', 'Active']
    );

    const created = await dbQuery(`SELECT * FROM supply_suppliers WHERE id = $1`, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supply/suppliers/:id
export async function updateSupplier(req, res) {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, address, status } = req.body;

    await dbQuery(
      `UPDATE supply_suppliers SET name = $1, contact_person = $2, phone = $3, address = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
      [name?.trim(), contact_person || '', phone || '', address || '', status || 'Active', id]
    );

    const updated = await dbQuery(`SELECT * FROM supply_suppliers WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supply/suppliers/:id
export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE supply_suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Supplier deleted.' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: error.message });
  }
}
