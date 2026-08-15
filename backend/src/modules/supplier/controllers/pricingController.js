import { dbQuery, generateUuid } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/supplier-management/pricing
export async function getPricing(req, res) {
  try {
    const { raw_material_id, vehicle_type_id, status } = req.query;
    let query = `
      SELECT rmp.*,
             rm.name as raw_material_name,
             vt.name as vehicle_type_name,
             u.name as unit_name, u.short_code as unit_code
      FROM raw_material_prices rmp
      LEFT JOIN raw_materials rm ON rmp.raw_material_id = rm.id
      LEFT JOIN vehicle_types vt ON rmp.vehicle_type_id = vt.id
      LEFT JOIN units u ON rmp.unit_id = u.id
      WHERE rmp.deleted_at IS NULL AND rmp.company_id = $1`;
    const params = [COMPANY_ID];

    if (raw_material_id) {
      params.push(raw_material_id);
      query += ` AND rmp.raw_material_id = $${params.length}`;
    }

    if (vehicle_type_id) {
      params.push(vehicle_type_id);
      query += ` AND rmp.vehicle_type_id = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND rmp.status = $${params.length}`;
    }

    query += ` ORDER BY rm.name ASC, vt.name ASC, rmp.effective_from DESC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching product pricing:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/pricing/resolve
export async function resolvePrice(req, res) {
  try {
    const { raw_material_id, vehicle_type_id, date } = req.query;
    if (!raw_material_id || !vehicle_type_id) {
      return res.status(400).json({ error: 'Raw material and vehicle type are required for price resolution.' });
    }

    const supplyDate = date || new Date().toISOString().split('T')[0];

    const rows = await dbQuery(`
      SELECT rmp.*, u.name as unit_name, u.short_code as unit_code
      FROM raw_material_prices rmp
      LEFT JOIN units u ON rmp.unit_id = u.id
      WHERE rmp.raw_material_id = $1
        AND rmp.vehicle_type_id = $2
        AND rmp.status = 'Active'
        AND rmp.deleted_at IS NULL
        AND rmp.company_id = $3
        AND rmp.effective_from <= $4
        AND (rmp.effective_to IS NULL OR rmp.effective_to >= $4)
      ORDER BY rmp.effective_from DESC
      LIMIT 1
    `, [raw_material_id, vehicle_type_id, COMPANY_ID, supplyDate]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Pricing is not configured for the selected Raw Material + Vehicle Type on this date.',
        resolved: false
      });
    }

    const record = rows[0];
    res.json({
      resolved: true,
      pricing_record_id: record.id,
      price: parseFloat(record.price),
      unit_id: record.unit_id,
      unit_name: record.unit_name,
      unit_code: record.unit_code,
      effective_from: record.effective_from,
      effective_to: record.effective_to
    });
  } catch (error) {
    console.error('Error resolving price:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/pricing
export async function createPricing(req, res) {
  try {
    const { raw_material_id, vehicle_type_id, price, effective_from, effective_to, status } = req.body;

    if (!raw_material_id) return res.status(400).json({ error: 'Raw material is required.' });
    if (!vehicle_type_id) return res.status(400).json({ error: 'Vehicle type is required.' });
    if (!price || parseFloat(price) <= 0) return res.status(400).json({ error: 'Price must be greater than zero.' });
    if (!effective_from) return res.status(400).json({ error: 'Effective from date is required.' });

    // Derive unit_id from raw material
    const rmRow = await dbQuery(`SELECT unit_id FROM raw_materials WHERE id = $1 AND deleted_at IS NULL`, [raw_material_id]);
    if (rmRow.length === 0) return res.status(400).json({ error: 'Selected raw material does not exist.' });
    const unit_id = rmRow[0].unit_id;

    // Check for overlapping active pricing periods
    const overlaps = await dbQuery(`
      SELECT id FROM raw_material_prices
      WHERE raw_material_id = $1
        AND vehicle_type_id = $2
        AND status = 'Active'
        AND deleted_at IS NULL
        AND company_id = $3
        AND (
          (effective_to IS NULL AND $4 >= effective_from) OR
          ($5 IS NULL AND effective_to >= $4) OR
          (effective_from <= $5 AND effective_to >= $4)
        )
    `, [raw_material_id, vehicle_type_id, COMPANY_ID, effective_from, effective_to || '9999-12-31']);

    if (overlaps.length > 0) {
      return res.status(400).json({ error: 'The same Raw Material + Vehicle Type cannot have overlapping active pricing periods.' });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO raw_material_prices (id, company_id, raw_material_id, vehicle_type_id, unit_id, price, effective_from, effective_to, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, COMPANY_ID, raw_material_id, vehicle_type_id, unit_id, parseFloat(price), effective_from, effective_to || null, status || 'Active']
    );

    const created = await dbQuery(`
      SELECT rmp.*, rm.name as raw_material_name, vt.name as vehicle_type_name, u.name as unit_name, u.short_code as unit_code
      FROM raw_material_prices rmp
      LEFT JOIN raw_materials rm ON rmp.raw_material_id = rm.id
      LEFT JOIN vehicle_types vt ON rmp.vehicle_type_id = vt.id
      LEFT JOIN units u ON rmp.unit_id = u.id
      WHERE rmp.id = $1
    `, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating product pricing:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supplier-management/pricing/:id
export async function updatePricing(req, res) {
  try {
    const { id } = req.params;
    const { price, effective_from, effective_to, status } = req.body;

    if (!price || parseFloat(price) <= 0) return res.status(400).json({ error: 'Price must be greater than zero.' });

    await dbQuery(
      `UPDATE raw_material_prices SET price = $1, effective_from = $2, effective_to = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND company_id = $6`,
      [parseFloat(price), effective_from, effective_to || null, status || 'Active', id, COMPANY_ID]
    );

    const updated = await dbQuery(`
      SELECT rmp.*, rm.name as raw_material_name, vt.name as vehicle_type_name, u.name as unit_name, u.short_code as unit_code
      FROM raw_material_prices rmp
      LEFT JOIN raw_materials rm ON rmp.raw_material_id = rm.id
      LEFT JOIN vehicle_types vt ON rmp.vehicle_type_id = vt.id
      LEFT JOIN units u ON rmp.unit_id = u.id
      WHERE rmp.id = $1
    `, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supplier-management/pricing/:id
export async function deletePricing(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE raw_material_prices SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
    res.json({ success: true, message: 'Pricing entry deleted.' });
  } catch (error) {
    console.error('Error deleting pricing:', error);
    res.status(500).json({ error: error.message });
  }
}
