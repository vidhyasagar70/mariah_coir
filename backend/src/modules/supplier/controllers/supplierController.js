import { dbQuery, getNextId, generateUuid } from '../../../config/db.js';

export async function getSuppliers(req, res) {
  try {
    const { category, status, search } = req.query;
    let query = `
      SELECT s.*, 
        COALESCE(SUM(CASE WHEN l.balance_impact = 'Owner Owes' THEN l.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN l.balance_impact = 'Owner Paid' THEN l.amount ELSE 0 END), 0) as net_balance
      FROM suppliers s
      LEFT JOIN supplier_ledger l ON s.id = l.supplier_id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND s.category = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (s.name LIKE $${params.length} OR s.company_name LIKE $${params.length} OR s.id LIKE $${params.length} OR s.contact_person LIKE $${params.length})`;
    }

    query += ` GROUP BY s.id ORDER BY s.created_at DESC`;

    const suppliers = await dbQuery(query, params);

    // Fetch vehicles for each supplier to attach as chips
    for (const sup of suppliers) {
      const vehs = await dbQuery('SELECT * FROM supplier_vehicles WHERE supplier_id = $1 ORDER BY vehicle_type', [sup.id]);
      sup.vehicles = vehs;
    }

    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getSupplierById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });

    const supplier = rows[0];
    const vehicles = await dbQuery('SELECT * FROM supplier_vehicles WHERE supplier_id = $1 ORDER BY vehicle_type', [id]);
    res.json({ ...supplier, vehicles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createSupplier(req, res) {
  try {
    const { name, category, company_name, contact_person, contact_number, status, vehicles } = req.body;
    if (!name || !category || !contact_number) {
      return res.status(400).json({ error: 'Supplier Name, Category, and Contact Number are required.' });
    }

    const id = await getNextId('SUP');
    const supStatus = status || 'Active';

    await dbQuery(
      `INSERT INTO suppliers (id, name, category, company_name, contact_person, contact_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, category, company_name || null, contact_person || null, contact_number, supStatus]
    );

    // Save vehicle rate repeater rows if provided
    if (Array.isArray(vehicles)) {
      for (const v of vehicles) {
        if (v.vehicle_type && v.rate_per_trip !== undefined && v.rate_per_trip !== '') {
          await dbQuery(
            `INSERT INTO supplier_vehicles (id, supplier_id, vehicle_type, rate_per_trip)
             VALUES ($1, $2, $3, $4)`,
            [generateUuid(), id, v.vehicle_type, parseFloat(v.rate_per_trip)]
          );
        }
      }
    }

    res.status(201).json({ id, message: 'Supplier created successfully' });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateSupplier(req, res) {
  try {
    const { id } = req.params;
    const { name, category, company_name, contact_person, contact_number, status, vehicles } = req.body;

    await dbQuery(
      `UPDATE suppliers 
       SET name = $1, category = $2, company_name = $3, contact_person = $4, contact_number = $5, status = $6
       WHERE id = $7`,
      [name, category, company_name, contact_person, contact_number, status, id]
    );

    // Update vehicle matrix if array provided
    if (Array.isArray(vehicles)) {
      await dbQuery('DELETE FROM supplier_vehicles WHERE supplier_id = $1', [id]);
      for (const v of vehicles) {
        if (v.vehicle_type && v.rate_per_trip !== undefined && v.rate_per_trip !== '') {
          await dbQuery(
            `INSERT INTO supplier_vehicles (id, supplier_id, vehicle_type, rate_per_trip)
             VALUES ($1, $2, $3, $4)`,
            [generateUuid(), id, v.vehicle_type, parseFloat(v.rate_per_trip)]
          );
        }
      }
    }

    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    await dbQuery('DELETE FROM suppliers WHERE id = $1', [id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSupplierVehicles(req, res) {
  try {
    const { id } = req.params;
    const vehicles = await dbQuery('SELECT * FROM supplier_vehicles WHERE supplier_id = $1 ORDER BY vehicle_type', [id]);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
