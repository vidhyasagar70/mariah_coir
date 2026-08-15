import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/vehicles - List supplier vehicles with join data
export async function getVehicles(req, res) {
  try {
    const { supplier_id, vehicle_type_id, search } = req.query;
    let query = `
      SELECT sv.*, 
             ss.name as supplier_name, ss.supplier_code,
             svt.name as vehicle_type_name
      FROM supply_vehicles sv
      LEFT JOIN supply_suppliers ss ON sv.supplier_id = ss.id
      LEFT JOIN supply_vehicle_types svt ON sv.vehicle_type_id = svt.id
      WHERE sv.deleted_at IS NULL`;
    const params = [];

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND sv.supplier_id = $${params.length}`;
    }

    if (vehicle_type_id) {
      params.push(vehicle_type_id);
      query += ` AND sv.vehicle_type_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (sv.vehicle_number LIKE $${params.length} OR ss.name LIKE $${params.length} OR svt.name LIKE $${params.length})`;
    }

    query += ` ORDER BY ss.name ASC, svt.name ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/vehicles
export async function createVehicle(req, res) {
  try {
    const { supplier_id, vehicle_type_id, vehicle_number, notes } = req.body;
    if (!supplier_id || !vehicle_type_id) {
      return res.status(400).json({ error: 'Supplier and Vehicle Type are required.' });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO supply_vehicles (id, supplier_id, vehicle_type_id, vehicle_number, notes, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, supplier_id, vehicle_type_id, vehicle_number || '', notes || '', 1]
    );

    // Return with join data
    const created = await dbQuery(`
      SELECT sv.*, ss.name as supplier_name, ss.supplier_code, svt.name as vehicle_type_name
      FROM supply_vehicles sv
      LEFT JOIN supply_suppliers ss ON sv.supplier_id = ss.id
      LEFT JOIN supply_vehicle_types svt ON sv.vehicle_type_id = svt.id
      WHERE sv.id = $1
    `, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supply/vehicles/:id
export async function updateVehicle(req, res) {
  try {
    const { id } = req.params;
    const { supplier_id, vehicle_type_id, vehicle_number, notes, status } = req.body;

    await dbQuery(
      `UPDATE supply_vehicles SET supplier_id = $1, vehicle_type_id = $2, vehicle_number = $3, notes = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
      [supplier_id, vehicle_type_id, vehicle_number || '', notes || '', status !== undefined ? (status ? 1 : 0) : 1, id]
    );

    const updated = await dbQuery(`
      SELECT sv.*, ss.name as supplier_name, ss.supplier_code, svt.name as vehicle_type_name
      FROM supply_vehicles sv
      LEFT JOIN supply_suppliers ss ON sv.supplier_id = ss.id
      LEFT JOIN supply_vehicle_types svt ON sv.vehicle_type_id = svt.id
      WHERE sv.id = $1
    `, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supply/vehicles/:id
export async function deleteVehicle(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE supply_vehicles SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Vehicle deleted.' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: error.message });
  }
}
