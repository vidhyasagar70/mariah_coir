import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/vehicle-types
export async function getVehicleTypes(req, res) {
  try {
    const { search, status } = req.query;
    let query = `SELECT * FROM supply_vehicle_types WHERE deleted_at IS NULL`;
    const params = [];

    if (status === 'active') {
      params.push(1);
      query += ` AND status = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(0);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name LIKE $${params.length} OR capacity LIKE $${params.length})`;
    }

    query += ` ORDER BY name ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/vehicle-types
export async function createVehicleType(req, res) {
  try {
    const { name, capacity, description, custom_alias } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vehicle type name is required.' });
    }

    const existing = await dbQuery(`SELECT id FROM supply_vehicle_types WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`, [name.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Vehicle type "${name.trim()}" already exists.` });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO supply_vehicle_types (id, name, capacity, description, custom_alias, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name.trim(), capacity || '', description || '', custom_alias || '', 1]
    );

    const created = await dbQuery(`SELECT * FROM supply_vehicle_types WHERE id = $1`, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating vehicle type:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supply/vehicle-types/:id
export async function updateVehicleType(req, res) {
  try {
    const { id } = req.params;
    const { name, capacity, description, custom_alias, status } = req.body;

    await dbQuery(
      `UPDATE supply_vehicle_types SET name = $1, capacity = $2, description = $3, custom_alias = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
      [name?.trim(), capacity || '', description || '', custom_alias || '', status !== undefined ? (status ? 1 : 0) : 1, id]
    );

    const updated = await dbQuery(`SELECT * FROM supply_vehicle_types WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating vehicle type:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supply/vehicle-types/:id
export async function deleteVehicleType(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE supply_vehicle_types SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Vehicle type deleted.' });
  } catch (error) {
    console.error('Error deleting vehicle type:', error);
    res.status(500).json({ error: error.message });
  }
}
