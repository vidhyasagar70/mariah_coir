import { dbQuery, generateUuid } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/supplier-management/raw-materials
export async function getRawMaterials(req, res) {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT rm.*, u.name as unit_name, u.short_code as unit_code, u.status as unit_status
      FROM raw_materials rm
      LEFT JOIN units u ON rm.unit_id = u.id
      WHERE rm.deleted_at IS NULL AND rm.company_id = $1`;
    const params = [COMPANY_ID];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND rm.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (rm.name LIKE $${params.length} OR rm.description LIKE $${params.length} OR u.name LIKE $${params.length})`;
    }

    query += ` ORDER BY rm.name ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/raw-materials
export async function createRawMaterial(req, res) {
  try {
    const { raw_material_name, unit_id, description, status } = req.body;
    const name = raw_material_name || req.body.name;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Raw material name is required.' });
    }
    if (!unit_id) {
      return res.status(400).json({ error: 'Unit is required.' });
    }

    // Verify unit exists and is Active
    const unitCheck = await dbQuery(
      `SELECT * FROM units WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`,
      [unit_id, COMPANY_ID]
    );
    if (unitCheck.length === 0) {
      return res.status(400).json({ error: 'Selected unit does not exist.' });
    }
    if (unitCheck[0].status !== 'Active') {
      return res.status(400).json({ error: 'Inactive units cannot be selected for new raw materials.' });
    }

    const trimmedName = name.trim();
    const id = generateUuid();
    await dbQuery(
      `INSERT INTO raw_materials (id, company_id, name, unit_id, unit, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, COMPANY_ID, trimmedName, unit_id, unitCheck[0].short_code, description || '', status || 'Active']
    );

    const created = await dbQuery(`
      SELECT rm.*, u.name as unit_name, u.short_code as unit_code
      FROM raw_materials rm
      LEFT JOIN units u ON rm.unit_id = u.id
      WHERE rm.id = $1
    `, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating raw material:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supplier-management/raw-materials/:id
export async function updateRawMaterial(req, res) {
  try {
    const { id } = req.params;
    const { raw_material_name, unit_id, description, status } = req.body;
    const name = raw_material_name || req.body.name;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Raw material name is required.' });
    }
    if (!unit_id) {
      return res.status(400).json({ error: 'Unit is required.' });
    }

    const unitCheck = await dbQuery(
      `SELECT * FROM units WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`,
      [unit_id, COMPANY_ID]
    );
    if (unitCheck.length === 0) {
      return res.status(400).json({ error: 'Selected unit does not exist.' });
    }

    const trimmedName = name.trim();
    await dbQuery(
      `UPDATE raw_materials SET name = $1, unit_id = $2, unit = $3, description = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND company_id = $7`,
      [trimmedName, unit_id, unitCheck[0].short_code, description || '', status || 'Active', id, COMPANY_ID]
    );

    const updated = await dbQuery(`
      SELECT rm.*, u.name as unit_name, u.short_code as unit_code
      FROM raw_materials rm
      LEFT JOIN units u ON rm.unit_id = u.id
      WHERE rm.id = $1
    `, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supplier-management/raw-materials/:id
export async function deleteRawMaterial(req, res) {
  try {
    const { id } = req.params;

    // Check if referenced by pricing or supply entries
    const refEntries = await dbQuery(
      `SELECT id FROM supply_entries WHERE raw_material_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (refEntries.length > 0) {
      return res.status(400).json({ error: 'Cannot delete raw material referenced by historical supply entries. Deactivate it instead.' });
    }

    await dbQuery(`UPDATE raw_materials SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
    res.json({ success: true, message: 'Raw material deleted successfully.' });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    res.status(500).json({ error: error.message });
  }
}
