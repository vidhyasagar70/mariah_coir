import { dbQuery, generateUuid } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/supplier-management/suppliers
export async function getSuppliers(req, res) {
  try {
    const { status, search } = req.query;
    let query = `SELECT * FROM suppliers WHERE deleted_at IS NULL AND company_id = $1`;
    const params = [COMPANY_ID];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (supplier_name LIKE $${params.length} OR supplier_number LIKE $${params.length} OR company_name LIKE $${params.length} OR phone_number LIKE $${params.length} OR contact_person LIKE $${params.length})`;
    }

    query += ` ORDER BY supplier_name ASC`;
    const rows = await dbQuery(query, params);

    // Enrich with counts of assigned raw materials, vehicle types, and vehicles
    for (const sup of rows) {
      const rmCount = await dbQuery(`SELECT COUNT(*) as count FROM supplier_raw_materials WHERE supplier_id = $1`, [sup.id]);
      const vtCount = await dbQuery(`SELECT COUNT(*) as count FROM supplier_vehicle_types WHERE supplier_id = $1`, [sup.id]);
      const vCount = await dbQuery(`SELECT COUNT(*) as count FROM supplier_vehicles WHERE supplier_id = $1`, [sup.id]);

      sup.raw_material_count = parseInt(rmCount[0]?.count || 0, 10);
      sup.vehicle_type_count = parseInt(vtCount[0]?.count || 0, 10);
      sup.vehicle_count = parseInt(vCount[0]?.count || 0, 10);
    }

    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/suppliers/:id
export async function getSupplierById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM suppliers WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`, [id, COMPANY_ID]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    const supplier = rows[0];

    // Fetch assigned raw materials
    const rawMaterials = await dbQuery(`
      SELECT rm.*, u.short_code as unit_code, u.name as unit_name
      FROM supplier_raw_materials srm
      JOIN raw_materials rm ON srm.raw_material_id = rm.id
      LEFT JOIN units u ON rm.unit_id = u.id
      WHERE srm.supplier_id = $1 AND rm.deleted_at IS NULL
    `, [id]);

    // Fetch assigned vehicle types
    const vehicleTypes = await dbQuery(`
      SELECT vt.*
      FROM supplier_vehicle_types svt
      JOIN vehicle_types vt ON svt.vehicle_type_id = vt.id
      WHERE svt.supplier_id = $1 AND vt.deleted_at IS NULL
    `, [id]);

    // Fetch assigned vehicles
    const vehicles = await dbQuery(`
      SELECT v.*, vt.name as vehicle_type_name
      FROM supplier_vehicles sv
      JOIN vehicles v ON sv.vehicle_id = v.id
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE sv.supplier_id = $1 AND v.deleted_at IS NULL
    `, [id]);

    // Fetch account summary
    const ledger = await dbQuery(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'ADVANCE_GIVEN' THEN amount ELSE 0 END), 0) as total_advance,
        COALESCE(SUM(CASE WHEN transaction_type = 'ADVANCE_ADJUSTMENT' THEN amount ELSE 0 END), 0) as advance_used,
        COALESCE(SUM(CASE WHEN transaction_type = 'SUPPLY_PAYABLE' THEN amount ELSE 0 END), 0) as total_supply_value,
        COALESCE(SUM(CASE WHEN transaction_type = 'SETTLEMENT' THEN amount ELSE 0 END), 0) as total_settled
      FROM supplier_account_transactions
      WHERE supplier_id = $1 AND company_id = $2
    `, [id, COMPANY_ID]);

    const acc = ledger[0] || {};
    const totalAdvance = parseFloat(acc.total_advance || 0);
    const advanceUsed = parseFloat(acc.advance_used || 0);
    const availableAdvance = Math.max(0, totalAdvance - advanceUsed);
    const totalSupply = parseFloat(acc.total_supply_value || 0);
    const totalSettled = parseFloat(acc.total_settled || 0);
    const outstandingDue = Math.max(0, totalSupply - advanceUsed - totalSettled);

    supplier.raw_materials = rawMaterials;
    supplier.vehicle_types = vehicleTypes;
    supplier.vehicles = vehicles;
    supplier.account_summary = {
      total_advance: totalAdvance,
      advance_used: advanceUsed,
      available_advance: availableAdvance,
      total_supply_value: totalSupply,
      total_settled: totalSettled,
      outstanding_due: outstandingDue
    };

    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier details:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/suppliers
export async function createSupplier(req, res) {
  try {
    const {
      supplier_name, company_name, supplier_number, phone_number, contact_person, status,
      raw_materials, vehicle_types, vehicles
    } = req.body;

    const name = supplier_name || req.body.name;
    const phone = phone_number || req.body.phone || req.body.contact_number;
    const contact = contact_person || req.body.contact;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Supplier name is required.' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required.' });
    if (!contact || !contact.trim()) return res.status(400).json({ error: 'Contact person is required.' });

    // Generate or validate supplier_number
    let supNum = supplier_number;
    if (!supNum) {
      const existing = await dbQuery(`SELECT supplier_number FROM suppliers WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`, [COMPANY_ID]);
      let nextNum = 1;
      if (existing.length > 0 && existing[0].supplier_number) {
        const numPart = parseInt(existing[0].supplier_number.replace('SUP-', ''), 10);
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      supNum = `SUP-${String(nextNum).padStart(3, '0')}`;
    }

    const trimmedNum = supNum.trim().toUpperCase();

    // Check unique supplier_number
    const checkDup = await dbQuery(`SELECT id FROM suppliers WHERE LOWER(supplier_number) = LOWER($1) AND deleted_at IS NULL AND company_id = $2`, [trimmedNum, COMPANY_ID]);
    if (checkDup.length > 0) {
      return res.status(400).json({ error: 'Supplier number must be unique within the company.' });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO suppliers (id, company_id, supplier_number, supplier_name, company_name, phone_number, contact_person, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, COMPANY_ID, trimmedNum, name.trim(), company_name || '', phone.trim(), contact.trim(), status || 'Active']
    );

    // Save assigned raw materials
    if (Array.isArray(raw_materials)) {
      for (const rmId of raw_materials) {
        await dbQuery(
          `INSERT INTO supplier_raw_materials (id, company_id, supplier_id, raw_material_id) VALUES ($1, $2, $3, $4)`,
          [generateUuid(), COMPANY_ID, id, rmId]
        );
      }
    }

    // Save assigned vehicle types
    if (Array.isArray(vehicle_types)) {
      for (const vtId of vehicle_types) {
        await dbQuery(
          `INSERT INTO supplier_vehicle_types (id, company_id, supplier_id, vehicle_type_id) VALUES ($1, $2, $3, $4)`,
          [generateUuid(), COMPANY_ID, id, vtId]
        );
      }
    }

    // Save assigned vehicles
    if (Array.isArray(vehicles)) {
      for (const vId of vehicles) {
        await dbQuery(
          `INSERT INTO supplier_vehicles (id, company_id, supplier_id, vehicle_id) VALUES ($1, $2, $3, $4)`,
          [generateUuid(), COMPANY_ID, id, vId]
        );
      }
    }

    const created = await getSupplierByIdInternal(id);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supplier-management/suppliers/:id
export async function updateSupplier(req, res) {
  try {
    const { id } = req.params;
    const {
      supplier_name, company_name, supplier_number, phone_number, contact_person, status,
      raw_materials, vehicle_types, vehicles
    } = req.body;

    const name = supplier_name || req.body.name;
    const phone = phone_number || req.body.phone || req.body.contact_number;
    const contact = contact_person || req.body.contact;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Supplier name is required.' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required.' });
    if (!contact || !contact.trim()) return res.status(400).json({ error: 'Contact person is required.' });

    await dbQuery(
      `UPDATE suppliers SET supplier_name = $1, company_name = $2, phone_number = $3, contact_person = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND company_id = $7`,
      [name.trim(), company_name || '', phone.trim(), contact.trim(), status || 'Active', id, COMPANY_ID]
    );

    // Sync raw materials
    if (Array.isArray(raw_materials)) {
      await dbQuery(`DELETE FROM supplier_raw_materials WHERE supplier_id = $1`, [id]);
      for (const rmId of raw_materials) {
        await dbQuery(
          `INSERT INTO supplier_raw_materials (id, company_id, supplier_id, raw_material_id) VALUES ($1, $2, $3, $4)`,
          [generateUuid(), COMPANY_ID, id, rmId]
        );
      }
    }

    // Sync vehicle types
    if (Array.isArray(vehicle_types)) {
      await dbQuery(`DELETE FROM supplier_vehicle_types WHERE supplier_id = $1`, [id]);
      for (const vtId of vehicle_types) {
        await dbQuery(
          `INSERT INTO supplier_vehicle_types (id, company_id, supplier_id, vehicle_type_id) VALUES ($1, $2, $3, $4)`,
          [generateUuid(), COMPANY_ID, id, vtId]
        );
      }
    }

    // Sync vehicles
    if (Array.isArray(vehicles)) {
      await dbQuery(`DELETE FROM supplier_vehicles WHERE supplier_id = $1`, [id]);
      for (const vId of vehicles) {
        await dbQuery(
          `INSERT INTO supplier_vehicles (id, company_id, supplier_id, vehicle_id) VALUES ($1, $2, $3, $4)`,
          [generateUuid(), COMPANY_ID, id, vId]
        );
      }
    }

    const updated = await getSupplierByIdInternal(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supplier-management/suppliers/:id
export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
    res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/suppliers/:id/raw-materials
export async function getSupplierRawMaterials(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`
      SELECT rm.*, u.short_code as unit_code, u.name as unit_name
      FROM supplier_raw_materials srm
      JOIN raw_materials rm ON srm.raw_material_id = rm.id
      LEFT JOIN units u ON rm.unit_id = u.id
      WHERE srm.supplier_id = $1 AND rm.deleted_at IS NULL AND rm.status = 'Active'
    `, [id]);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching supplier raw materials:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/suppliers/:id/vehicle-types
export async function getSupplierVehicleTypes(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`
      SELECT vt.*
      FROM supplier_vehicle_types svt
      JOIN vehicle_types vt ON svt.vehicle_type_id = vt.id
      WHERE svt.supplier_id = $1 AND vt.deleted_at IS NULL AND vt.status = 'Active'
    `, [id]);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching supplier vehicle types:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/suppliers/:id/vehicles
export async function getSupplierVehicles(req, res) {
  try {
    const { id } = req.params;
    const { vehicle_type_id } = req.query;

    let query = `
      SELECT v.*, vt.name as vehicle_type_name
      FROM supplier_vehicles sv
      JOIN vehicles v ON sv.vehicle_id = v.id
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE sv.supplier_id = $1 AND v.deleted_at IS NULL AND v.status = 'Active'`;
    const params = [id];

    if (vehicle_type_id) {
      params.push(vehicle_type_id);
      query += ` AND v.vehicle_type_id = $${params.length}`;
    }

    query += ` ORDER BY v.vehicle_number ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching supplier vehicles:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper for fetching full supplier JSON internally
async function getSupplierByIdInternal(id) {
  const rows = await dbQuery(`SELECT * FROM suppliers WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
  if (rows.length === 0) return null;
  const supplier = rows[0];

  supplier.raw_materials = await dbQuery(`
    SELECT rm.*, u.short_code as unit_code, u.name as unit_name
    FROM supplier_raw_materials srm
    JOIN raw_materials rm ON srm.raw_material_id = rm.id
    LEFT JOIN units u ON rm.unit_id = u.id
    WHERE srm.supplier_id = $1 AND rm.deleted_at IS NULL
  `, [id]);

  supplier.vehicle_types = await dbQuery(`
    SELECT vt.*
    FROM supplier_vehicle_types svt
    JOIN vehicle_types vt ON svt.vehicle_type_id = vt.id
    WHERE svt.supplier_id = $1 AND vt.deleted_at IS NULL
  `, [id]);

  supplier.vehicles = await dbQuery(`
    SELECT v.*, vt.name as vehicle_type_name
    FROM supplier_vehicles sv
    JOIN vehicles v ON sv.vehicle_id = v.id
    LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
    WHERE sv.supplier_id = $1 AND v.deleted_at IS NULL
  `, [id]);

  return supplier;
}
