import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/vehicles - List supplier vehicles with join data
export async function getVehicles(req, res) {
  try {
    const { supplier_id, vehicle_type_id, search } = req.query;
    let query = `
      SELECT sv.*, 
             COALESCE(ss.name, ss.company_name, 'Supplier') as supplier_name,
             ss.id as supplier_code,
             svt.name as vehicle_type_name
      FROM supply_vehicles sv
      LEFT JOIN suppliers ss ON sv.supplier_id = ss.id
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

    query += ` ORDER BY supplier_name ASC, svt.name ASC`;
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
    const { supplier_id, supplier_ids, vehicle_type_id, vehicle_number, notes, custom_driver_info, vehicles } = req.body;
    
    // Support single supplier_id or fallback array
    const targetSupplierId = supplier_id || (Array.isArray(supplier_ids) && supplier_ids.length > 0 ? supplier_ids[0] : null);

    if (!targetSupplierId && (!Array.isArray(supplier_ids) || supplier_ids.length === 0)) {
      return res.status(400).json({ error: 'Supplier is required.' });
    }

    // Prepare list of vehicle items to create
    let itemsToCreate = [];
    if (Array.isArray(vehicles) && vehicles.length > 0) {
      itemsToCreate = vehicles;
    } else if (vehicle_type_id) {
      itemsToCreate = [{ vehicle_type_id, vehicle_number, notes, custom_driver_info }];
    } else if (Array.isArray(supplier_ids) && supplier_ids.length > 0) {
      for (const suppId of supplier_ids) {
        itemsToCreate.push({ supplier_id: suppId, vehicle_type_id, vehicle_number, notes, custom_driver_info });
      }
    }

    if (itemsToCreate.length === 0) {
      return res.status(400).json({ error: 'At least one Vehicle Type is required.' });
    }

    const createdIds = [];
    for (const item of itemsToCreate) {
      const sId = item.supplier_id || targetSupplierId;
      const vTypeId = item.vehicle_type_id;
      if (!sId || !vTypeId) continue;
      const vNum = (item.vehicle_number || '').trim();
      const vNotes = item.notes || '';
      const vDriver = item.custom_driver_info || '';

      // Avoid duplicate vehicle assignment to the same supplier if already exists
      const existing = await dbQuery(
        `SELECT id FROM supply_vehicles WHERE supplier_id = $1 AND vehicle_type_id = $2 AND LOWER(vehicle_number) = LOWER($3) AND deleted_at IS NULL`,
        [sId, vTypeId, vNum]
      );

      if (existing.length > 0) {
        createdIds.push(existing[0].id);
      } else {
        const id = generateUuid();
        await dbQuery(
          `INSERT INTO supply_vehicles (id, supplier_id, vehicle_type_id, vehicle_number, notes, custom_driver_info, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, sId, vTypeId, vNum, vNotes, vDriver, 1]
        );
        createdIds.push(id);
      }
    }

    // Return all created/assigned vehicle objects with join data
    const createdRows = [];
    for (const cid of createdIds) {
      const rows = await dbQuery(`
        SELECT sv.*, 
               COALESCE(ss.name, ss.company_name, 'Supplier') as supplier_name, 
               ss.id as supplier_code, 
               svt.name as vehicle_type_name
        FROM supply_vehicles sv
        LEFT JOIN suppliers ss ON sv.supplier_id = ss.id
        LEFT JOIN supply_vehicle_types svt ON sv.vehicle_type_id = svt.id
        WHERE sv.id = $1
      `, [cid]);
      if (rows.length > 0) createdRows.push(rows[0]);
    }

    res.status(201).json(createdRows.length === 1 ? createdRows[0] : { data: createdRows, total: createdRows.length });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supply/vehicles/:id
export async function updateVehicle(req, res) {
  try {
    const { id } = req.params;
    const { supplier_id, supplier_ids, vehicle_type_id, vehicle_number, notes, custom_driver_info, status } = req.body;

    const mainSupplierId = Array.isArray(supplier_ids) && supplier_ids.length > 0 ? supplier_ids[0] : supplier_id;

    await dbQuery(
      `UPDATE supply_vehicles SET supplier_id = $1, vehicle_type_id = $2, vehicle_number = $3, notes = $4, custom_driver_info = $5, status = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7`,
      [mainSupplierId, vehicle_type_id, (vehicle_number || '').trim(), notes || '', custom_driver_info || '', status !== undefined ? (status ? 1 : 0) : 1, id]
    );

    // If multiple suppliers selected on update, ensure additional supplier records exist
    if (Array.isArray(supplier_ids) && supplier_ids.length > 1) {
      for (let i = 1; i < supplier_ids.length; i++) {
        const suppId = supplier_ids[i];
        const existing = await dbQuery(
          `SELECT id FROM supply_vehicles WHERE supplier_id = $1 AND vehicle_type_id = $2 AND LOWER(vehicle_number) = LOWER($3) AND deleted_at IS NULL`,
          [suppId, vehicle_type_id, (vehicle_number || '').trim()]
        );
        if (existing.length === 0) {
          const newId = generateUuid();
          await dbQuery(
            `INSERT INTO supply_vehicles (id, supplier_id, vehicle_type_id, vehicle_number, notes, custom_driver_info, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [newId, suppId, vehicle_type_id, (vehicle_number || '').trim(), notes || '', custom_driver_info || '', 1]
          );
        }
      }
    }

    const updated = await dbQuery(`
      SELECT sv.*, 
             COALESCE(ss.name, ss.company_name, 'Supplier') as supplier_name, 
             ss.id as supplier_code, 
             svt.name as vehicle_type_name
      FROM supply_vehicles sv
      LEFT JOIN suppliers ss ON sv.supplier_id = ss.id
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
