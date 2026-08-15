import { dbQuery, generateUuid } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/supplier-management/vehicle-types
export async function getVehicleTypes(req, res) {
  try {
    const { status, search } = req.query;
    let query = `SELECT * FROM vehicle_types WHERE deleted_at IS NULL AND company_id = $1`;
    const params = [COMPANY_ID];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name LIKE $${params.length} OR description LIKE $${params.length})`;
    }

    query += ` ORDER BY name ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/vehicle-types
export async function createVehicleType(req, res) {
  try {
    const { vehicle_type_name, description, status } = req.body;
    const name = vehicle_type_name || req.body.name;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vehicle type name is required.' });
    }

    const trimmedName = name.trim();
    const id = generateUuid();
    await dbQuery(
      `INSERT INTO vehicle_types (id, company_id, name, description, status) VALUES ($1, $2, $3, $4, $5)`,
      [id, COMPANY_ID, trimmedName, description || '', status || 'Active']
    );

    const created = await dbQuery(`SELECT * FROM vehicle_types WHERE id = $1`, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating vehicle type:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supplier-management/vehicle-types/:id
export async function updateVehicleType(req, res) {
  try {
    const { id } = req.params;
    const { vehicle_type_name, description, status } = req.body;
    const name = vehicle_type_name || req.body.name;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vehicle type name is required.' });
    }

    const trimmedName = name.trim();
    await dbQuery(
      `UPDATE vehicle_types SET name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND company_id = $5`,
      [trimmedName, description || '', status || 'Active', id, COMPANY_ID]
    );

    const updated = await dbQuery(`SELECT * FROM vehicle_types WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating vehicle type:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supplier-management/vehicle-types/:id
export async function deleteVehicleType(req, res) {
  try {
    const { id } = req.params;

    // Check if referenced by vehicles or supply entries
    const refVehicles = await dbQuery(
      `SELECT id FROM vehicles WHERE vehicle_type_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (refVehicles.length > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle type referenced by registered vehicles. Deactivate it instead.' });
    }

    await dbQuery(`UPDATE vehicle_types SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
    res.json({ success: true, message: 'Vehicle type deleted successfully.' });
  } catch (error) {
    console.error('Error deleting vehicle type:', error);
    res.status(500).json({ error: error.message });
  }
}
