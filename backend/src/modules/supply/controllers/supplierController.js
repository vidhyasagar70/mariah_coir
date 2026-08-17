import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/suppliers
export async function getSuppliers(req, res) {
  try {
    const { search, status, category } = req.query;
    let query = `SELECT * FROM suppliers WHERE deleted_at IS NULL`;
    const params = [];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name LIKE $${params.length} OR company_name LIKE $${params.length} OR contact_person LIKE $${params.length} OR phone LIKE $${params.length} OR contact_number LIKE $${params.length} OR supplier_code LIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;
    const rows = await dbQuery(query, params);
    
    // Normalize field aliases for frontend compatibility
    const normalized = rows.map(r => ({
      ...r,
      supplier_code: r.id || r.supplier_code || r.supplier_number,
      phone: r.contact_number || r.phone || r.phone_number || '',
      contact_number: r.contact_number || r.phone || r.phone_number || ''
    }));

    res.json({ data: normalized, total: normalized.length });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supply/suppliers/:id
export async function getSupplierById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM suppliers WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    const r = rows[0];
    res.json({
      ...r,
      supplier_code: r.id || r.supplier_code || r.supplier_number,
      phone: r.contact_number || r.phone || r.phone_number || '',
      contact_number: r.contact_number || r.phone || r.phone_number || ''
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/suppliers
export async function createSupplier(req, res) {
  try {
    const { name, company_name, contact_person, phone, contact_number, category, custom_notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required.' });
    }

    const phoneVal = (contact_number || phone || 'N/A').trim();
    const contactPersonVal = (contact_person || 'N/A').trim();
    const companyNameVal = (company_name || name || '').trim();
    const categoryVal = category || 'Raw Material';
    const notesVal = custom_notes || '';

    // Auto-generate supplier ID (SSUP-001 format)
    const existing = await dbQuery(`SELECT id FROM suppliers ORDER BY created_at DESC LIMIT 1`);
    let nextNum = 1;
    if (existing.length > 0 && existing[0].id) {
      const numPart = parseInt(existing[0].id.replace('SSUP-', '').replace('SUP-', ''), 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }
    const id = `SSUP-${String(nextNum).padStart(3, '0')}`;

    await dbQuery(
      `INSERT INTO suppliers (id, supplier_code, supplier_number, supplier_name, name, company_name, contact_person, phone, phone_number, contact_number, category, custom_notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, id, id, name.trim(), name.trim(), companyNameVal, contactPersonVal, phoneVal, phoneVal, phoneVal, categoryVal, notesVal, 'Active']
    );

    const created = await dbQuery(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    const r = created[0];
    res.status(201).json({
      ...r,
      supplier_code: r.id,
      phone: r.contact_number || r.phone || r.phone_number || '',
      contact_number: r.contact_number || r.phone || r.phone_number || ''
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supply/suppliers/:id
export async function updateSupplier(req, res) {
  try {
    const { id } = req.params;
    const { name, company_name, contact_person, phone, contact_number, category, custom_notes, status } = req.body;
    const phoneVal = (contact_number || phone || '').trim();

    await dbQuery(
      `UPDATE suppliers 
       SET name = $1, supplier_name = $1, company_name = $2, contact_person = $3, phone = $4, phone_number = $4, contact_number = $4, category = $5, custom_notes = $6, status = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8`,
      [name?.trim(), company_name || '', contact_person || '', phoneVal, category || 'Raw Material', custom_notes || '', status || 'Active', id]
    );

    const updated = await dbQuery(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    const r = updated[0];
    res.json({
      ...r,
      supplier_code: r.id,
      phone: r.contact_number || r.phone || r.phone_number || '',
      contact_number: r.contact_number || r.phone || r.phone_number || ''
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supply/suppliers/:id
export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Supplier deleted.' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

