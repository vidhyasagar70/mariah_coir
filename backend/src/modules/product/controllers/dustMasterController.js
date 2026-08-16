import { dbQuery, getNextId } from '../../../config/db.js';

const VALID_STANDARD_VEHICLES = ['Tractor', 'Pickup', '6-Wheeler Tipper', '10-Wheeler Lorry', 'Trailer'];

// GET /api/dust/master
export async function getDustMaster(req, res) {
  try {
    const { search, status } = req.query;
    let query = `SELECT * FROM dust_master WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (dust_name LIKE $${pIdx} OR custom_vehicle_name LIKE $${pIdx} OR standard_vehicle_type LIKE $${pIdx} OR id LIKE $${pIdx})`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC, id DESC`;

    const items = await dbQuery(query, params);
    const allItems = await dbQuery(`SELECT status FROM dust_master`);

    const summary = {
      totalItems: allItems.length,
      activeItems: allItems.filter(i => i.status === 'Active').length,
      inactiveItems: allItems.filter(i => i.status === 'Inactive').length
    };

    res.json({ items, summary });
  } catch (error) {
    console.error('Error fetching dust master:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/dust/master/:id
export async function getDustMasterById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM dust_master WHERE id = $1`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `Dust Master record ${id} not found.` });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching dust master by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/dust/master
export async function createDustMaster(req, res) {
  try {
    const { dust_name, standard_vehicle_type, custom_vehicle_name, fixed_rate_per_load, status } = req.body;

    if (!dust_name || !dust_name.trim()) {
      return res.status(400).json({ error: 'Dust name is required.' });
    }

    if (!standard_vehicle_type || !VALID_STANDARD_VEHICLES.includes(standard_vehicle_type)) {
      return res.status(400).json({
        error: `Standard vehicle type must be one of: ${VALID_STANDARD_VEHICLES.join(', ')}`
      });
    }

    const rateNum = parseFloat(fixed_rate_per_load);
    if (isNaN(rateNum) || rateNum < 0) {
      return res.status(400).json({ error: 'Fixed rate per load must be a non-negative number.' });
    }

    const itemStatus = status === 'Inactive' ? 'Inactive' : 'Active';
    const newId = await getNextId('DST');

    await dbQuery(
      `INSERT INTO dust_master (id, dust_name, standard_vehicle_type, custom_vehicle_name, fixed_rate_per_load, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newId,
        dust_name.trim(),
        standard_vehicle_type,
        custom_vehicle_name ? custom_vehicle_name.trim() : null,
        rateNum,
        itemStatus
      ]
    );

    const created = await dbQuery(`SELECT * FROM dust_master WHERE id = $1`, [newId]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating dust master:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/dust/master/:id
export async function updateDustMaster(req, res) {
  try {
    const { id } = req.params;
    const { dust_name, standard_vehicle_type, custom_vehicle_name, fixed_rate_per_load, status } = req.body;

    const existing = await dbQuery(`SELECT * FROM dust_master WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Dust Master record ${id} not found.` });
    }

    if (!dust_name || !dust_name.trim()) {
      return res.status(400).json({ error: 'Dust name is required.' });
    }

    if (!standard_vehicle_type || !VALID_STANDARD_VEHICLES.includes(standard_vehicle_type)) {
      return res.status(400).json({
        error: `Standard vehicle type must be one of: ${VALID_STANDARD_VEHICLES.join(', ')}`
      });
    }

    const rateNum = parseFloat(fixed_rate_per_load);
    if (isNaN(rateNum) || rateNum < 0) {
      return res.status(400).json({ error: 'Fixed rate per load must be a non-negative number.' });
    }

    const itemStatus = status === 'Inactive' ? 'Inactive' : 'Active';

    await dbQuery(
      `UPDATE dust_master
       SET dust_name = $1, standard_vehicle_type = $2, custom_vehicle_name = $3, fixed_rate_per_load = $4, status = $5
       WHERE id = $6`,
      [
        dust_name.trim(),
        standard_vehicle_type,
        custom_vehicle_name ? custom_vehicle_name.trim() : null,
        rateNum,
        itemStatus,
        id
      ]
    );

    const updated = await dbQuery(`SELECT * FROM dust_master WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating dust master:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/dust/master/:id
export async function deleteDustMaster(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM dust_master WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Dust Master record ${id} not found.` });
    }

    // Check if referenced by sales
    const refSales = await dbQuery(`SELECT id FROM dust_sales WHERE dust_id = $1 LIMIT 1`, [id]);
    if (refSales.length > 0) {
      return res.status(400).json({ error: 'Cannot delete Dust Master record linked to existing sales dispatches. Set status to Inactive instead.' });
    }

    await dbQuery(`DELETE FROM dust_master WHERE id = $1`, [id]);
    res.json({ success: true, message: `Dust Master record ${id} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting dust master:', error);
    res.status(500).json({ error: error.message });
  }
}
