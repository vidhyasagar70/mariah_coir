import { dbQuery, generateUuid } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/supplier-management/vehicles
export async function getVehicles(req, res) {
  try {
    const { vehicle_type_id, status, search } = req.query;
    let query = `
      SELECT v.*, vt.name as vehicle_type_name
      FROM vehicles v
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE v.deleted_at IS NULL AND v.company_id = $1`;
    const params = [COMPANY_ID];

    if (vehicle_type_id) {
      params.push(vehicle_type_id);
      query += ` AND v.vehicle_type_id = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (v.vehicle_number LIKE $${params.length} OR vt.name LIKE $${params.length})`;
    }

    query += ` ORDER BY v.vehicle_number ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/vehicles
export async function createVehicle(req, res) {
  try {
    const { vehicle_number, vehicle_type_id, status } = req.body;

    if (!vehicle_number || !vehicle_number.trim()) {
      return res.status(400).json({ error: 'Vehicle number is required.' });
    }
    if (!vehicle_type_id) {
      return res.status(400).json({ error: 'Vehicle type is required.' });
    }

    const trimmedNum = vehicle_number.trim().toUpperCase();

    // Check unique vehicle_number
    const existing = await dbQuery(
      `SELECT id FROM vehicles WHERE LOWER(vehicle_number) = LOWER($1) AND deleted_at IS NULL AND company_id = $2`,
      [trimmedNum, COMPANY_ID]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Vehicle number must be unique within the company.' });
    }

    const vtCheck = await dbQuery(
      `SELECT id FROM vehicle_types WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`,
      [vehicle_type_id, COMPANY_ID]
    );
    if (vtCheck.length === 0) {
      return res.status(400).json({ error: 'Selected vehicle type does not exist.' });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO vehicles (id, company_id, vehicle_number, vehicle_type_id, status) VALUES ($1, $2, $3, $4, $5)`,
      [id, COMPANY_ID, trimmedNum, vehicle_type_id, status || 'Active']
    );

    const created = await dbQuery(`
      SELECT v.*, vt.name as vehicle_type_name
      FROM vehicles v
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE v.id = $1
    `, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supplier-management/vehicles/:id
export async function updateVehicle(req, res) {
  try {
    const { id } = req.params;
    const { vehicle_number, vehicle_type_id, status } = req.body;

    if (!vehicle_number || !vehicle_number.trim()) {
      return res.status(400).json({ error: 'Vehicle number is required.' });
    }
    if (!vehicle_type_id) {
      return res.status(400).json({ error: 'Vehicle type is required.' });
    }

    const trimmedNum = vehicle_number.trim().toUpperCase();

    const existing = await dbQuery(
      `SELECT id FROM vehicles WHERE LOWER(vehicle_number) = LOWER($1) AND id != $2 AND deleted_at IS NULL AND company_id = $3`,
      [trimmedNum, id, COMPANY_ID]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Vehicle number must be unique within the company.' });
    }

    await dbQuery(
      `UPDATE vehicles SET vehicle_number = $1, vehicle_type_id = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND company_id = $5`,
      [trimmedNum, vehicle_type_id, status || 'Active', id, COMPANY_ID]
    );

    const updated = await dbQuery(`
      SELECT v.*, vt.name as vehicle_type_name
      FROM vehicles v
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE v.id = $1
    `, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supplier-management/vehicles/:id
export async function deleteVehicle(req, res) {
  try {
    const { id } = req.params;

    // Check if referenced by supply entries
    const refEntries = await dbQuery(
      `SELECT id FROM supply_entries WHERE vehicle_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (refEntries.length > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle referenced by historical transactions. Deactivate it instead.' });
    }

    await dbQuery(`UPDATE vehicles SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
    res.json({ success: true, message: 'Vehicle deleted successfully.' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: error.message });
  }
}
