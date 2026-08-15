import { dbQuery, generateUuid } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/supplier-management/units
export async function getUnits(req, res) {
  try {
    const { status, search } = req.query;
    let query = `SELECT * FROM units WHERE deleted_at IS NULL AND company_id = $1`;
    const params = [COMPANY_ID];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name LIKE $${params.length} OR short_code LIKE $${params.length})`;
    }

    query += ` ORDER BY name ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/units
export async function createUnit(req, res) {
  try {
    const { name, short_code, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Unit name is required.' });
    }
    if (!short_code || !short_code.trim()) {
      return res.status(400).json({ error: 'Unit code is required.' });
    }

    const trimmedName = name.trim();
    const trimmedCode = short_code.trim().toUpperCase();

    // Check unique name & short_code per company
    const existingName = await dbQuery(
      `SELECT id FROM units WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL AND company_id = $2`,
      [trimmedName, COMPANY_ID]
    );
    if (existingName.length > 0) {
      return res.status(400).json({ error: 'Unit name must be unique within the company.' });
    }

    const existingCode = await dbQuery(
      `SELECT id FROM units WHERE LOWER(short_code) = LOWER($1) AND deleted_at IS NULL AND company_id = $2`,
      [trimmedCode, COMPANY_ID]
    );
    if (existingCode.length > 0) {
      return res.status(400).json({ error: 'Unit code must be unique within the company.' });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO units (id, company_id, name, short_code, status) VALUES ($1, $2, $3, $4, $5)`,
      [id, COMPANY_ID, trimmedName, trimmedCode, status || 'Active']
    );

    const created = await dbQuery(`SELECT * FROM units WHERE id = $1`, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supplier-management/units/:id
export async function updateUnit(req, res) {
  try {
    const { id } = req.params;
    const { name, short_code, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Unit name is required.' });
    }
    if (!short_code || !short_code.trim()) {
      return res.status(400).json({ error: 'Unit code is required.' });
    }

    const trimmedName = name.trim();
    const trimmedCode = short_code.trim().toUpperCase();

    // Check uniqueness excluding current ID
    const existingName = await dbQuery(
      `SELECT id FROM units WHERE LOWER(name) = LOWER($1) AND id != $2 AND deleted_at IS NULL AND company_id = $3`,
      [trimmedName, id, COMPANY_ID]
    );
    if (existingName.length > 0) {
      return res.status(400).json({ error: 'Unit name must be unique within the company.' });
    }

    const existingCode = await dbQuery(
      `SELECT id FROM units WHERE LOWER(short_code) = LOWER($1) AND id != $2 AND deleted_at IS NULL AND company_id = $3`,
      [trimmedCode, id, COMPANY_ID]
    );
    if (existingCode.length > 0) {
      return res.status(400).json({ error: 'Unit code must be unique within the company.' });
    }

    await dbQuery(
      `UPDATE units SET name = $1, short_code = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND company_id = $5`,
      [trimmedName, trimmedCode, status || 'Active', id, COMPANY_ID]
    );

    const updated = await dbQuery(`SELECT * FROM units WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating unit:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supplier-management/units/:id
export async function deleteUnit(req, res) {
  try {
    const { id } = req.params;

    // Check if referenced by raw materials
    const refMaterials = await dbQuery(
      `SELECT id FROM raw_materials WHERE unit_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (refMaterials.length > 0) {
      return res.status(400).json({ error: 'Cannot delete unit referenced by active raw materials. Deactivate it instead.' });
    }

    // Check if referenced by historical supply entries
    const refEntries = await dbQuery(
      `SELECT id FROM supply_entries WHERE unit_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (refEntries.length > 0) {
      return res.status(400).json({ error: 'Cannot delete unit referenced by historical transactions. Deactivate it instead.' });
    }

    await dbQuery(`UPDATE units SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
    res.json({ success: true, message: 'Unit deleted successfully.' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: error.message });
  }
}
