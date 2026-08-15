import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/pricing - List pricing rules with join data
export async function getPricing(req, res) {
  try {
    const { raw_material_id, vehicle_type_id, status } = req.query;
    let query = `
      SELECT sp.*,
             rm.name as raw_material_name,
             svt.name as vehicle_type_name
      FROM supply_pricing sp
      LEFT JOIN raw_materials rm ON sp.raw_material_id = rm.id
      LEFT JOIN supply_vehicle_types svt ON sp.vehicle_type_id = svt.id
      WHERE sp.deleted_at IS NULL`;
    const params = [];

    if (raw_material_id) {
      params.push(raw_material_id);
      query += ` AND sp.raw_material_id = $${params.length}`;
    }

    if (vehicle_type_id) {
      params.push(vehicle_type_id);
      query += ` AND sp.vehicle_type_id = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND sp.status = $${params.length}`;
    }

    query += ` ORDER BY rm.name ASC, svt.name ASC, sp.effective_from DESC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supply/pricing/resolve - Resolve price for a given material + vehicle type on a date
export async function resolvePrice(req, res) {
  try {
    const { raw_material_id, vehicle_type_id, date } = req.query;
    if (!raw_material_id || !vehicle_type_id) {
      return res.status(400).json({ error: 'raw_material_id and vehicle_type_id are required.' });
    }

    const resolveDate = date || new Date().toISOString().split('T')[0];

    const rows = await dbQuery(`
      SELECT sp.rate_per_unit, sp.effective_from, sp.effective_to,
             rm.name as raw_material_name, svt.name as vehicle_type_name
      FROM supply_pricing sp
      LEFT JOIN raw_materials rm ON sp.raw_material_id = rm.id
      LEFT JOIN supply_vehicle_types svt ON sp.vehicle_type_id = svt.id
      WHERE sp.raw_material_id = $1
        AND sp.vehicle_type_id = $2
        AND sp.status = 'Active'
        AND sp.deleted_at IS NULL
        AND sp.effective_from <= $3
        AND (sp.effective_to IS NULL OR sp.effective_to >= $3)
      ORDER BY sp.effective_from DESC
      LIMIT 1
    `, [raw_material_id, vehicle_type_id, resolveDate]);

    if (rows.length === 0) {
      return res.json({ resolved: false, rate_per_unit: null, message: 'No active pricing found for this combination.' });
    }

    res.json({ resolved: true, ...rows[0] });
  } catch (error) {
    console.error('Error resolving price:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/pricing
export async function createPricing(req, res) {
  try {
    const { raw_material_id, vehicle_type_id, rate_per_unit, effective_from, effective_to } = req.body;
    if (!raw_material_id || !vehicle_type_id || !rate_per_unit || !effective_from) {
      return res.status(400).json({ error: 'Raw material, vehicle type, rate, and effective date are required.' });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO supply_pricing (id, raw_material_id, vehicle_type_id, rate_per_unit, effective_from, effective_to, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, raw_material_id, vehicle_type_id, parseFloat(rate_per_unit), effective_from, effective_to || null, 'Active']
    );

    const created = await dbQuery(`
      SELECT sp.*, rm.name as raw_material_name, svt.name as vehicle_type_name
      FROM supply_pricing sp
      LEFT JOIN raw_materials rm ON sp.raw_material_id = rm.id
      LEFT JOIN supply_vehicle_types svt ON sp.vehicle_type_id = svt.id
      WHERE sp.id = $1
    `, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating pricing:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supply/pricing/:id
export async function updatePricing(req, res) {
  try {
    const { id } = req.params;
    const { raw_material_id, vehicle_type_id, rate_per_unit, effective_from, effective_to, status } = req.body;

    await dbQuery(
      `UPDATE supply_pricing SET raw_material_id = $1, vehicle_type_id = $2, rate_per_unit = $3, effective_from = $4, effective_to = $5, status = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7`,
      [raw_material_id, vehicle_type_id, parseFloat(rate_per_unit), effective_from, effective_to || null, status || 'Active', id]
    );

    const updated = await dbQuery(`
      SELECT sp.*, rm.name as raw_material_name, svt.name as vehicle_type_name
      FROM supply_pricing sp
      LEFT JOIN raw_materials rm ON sp.raw_material_id = rm.id
      LEFT JOIN supply_vehicle_types svt ON sp.vehicle_type_id = svt.id
      WHERE sp.id = $1
    `, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supply/pricing/:id
export async function deletePricing(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE supply_pricing SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Pricing rule deleted.' });
  } catch (error) {
    console.error('Error deleting pricing:', error);
    res.status(500).json({ error: error.message });
  }
}
