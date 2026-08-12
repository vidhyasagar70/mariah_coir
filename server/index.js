import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, dbQuery, getNextId, generateUuid } from './db.js';
import { seedData } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database on Startup
initDb().then(async () => {
  console.log('[SERVER] DB Initialized.');
  // Check if suppliers exist, if not seed initial data
  const existing = await dbQuery('SELECT COUNT(*) as count FROM suppliers');
  const count = parseInt(existing[0]?.count || existing[0]?.['COUNT(*)'] || 0, 10);
  if (count === 0) {
    console.log('[SERVER] Empty DB detected. Seeding initial Coir ERP dataset...');
    await seedData();
  }
}).catch(err => {
  console.error('[SERVER] Error initializing DB:', err);
});

// Seed API endpoint
app.post('/api/seed', async (req, res) => {
  try {
    await seedData();
    res.json({ success: true, message: 'Database seeded successfully with Coir ERP sample data.' });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SM-01: SUPPLIERS & VEHICLE RATE MATRIX
// ==========================================

// List Suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = `
      SELECT s.*, 
        COALESCE(COUNT(v.id), 0) as vehicle_count,
        COALESCE(SUM(CASE WHEN l.balance_impact = 'Owner Owes' THEN l.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN l.balance_impact = 'Owner Paid' THEN l.amount ELSE 0 END), 0) as net_balance
      FROM suppliers s
      LEFT JOIN supplier_vehicles v ON s.id = v.supplier_id
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
      query += ` AND (s.name ILIKE $${params.length} OR s.company_name ILIKE $${params.length} OR s.id ILIKE $${params.length} OR s.contact_person ILIKE $${params.length})`;
    }

    query += ` GROUP BY s.id ORDER BY s.created_at DESC`;

    // Handle SQLite fallback ILIKE case
    const safeQuery = query.replace(/ILIKE/g, 'LIKE');
    const suppliers = await dbQuery(safeQuery, params);

    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Single Supplier Details with Vehicles
app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplierRows = await dbQuery('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (supplierRows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplier = supplierRows[0];
    const vehicles = await dbQuery('SELECT * FROM supplier_vehicles WHERE supplier_id = $1 ORDER BY vehicle_type', [id]);
    
    res.json({ ...supplier, vehicles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Supplier
app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, category, company_name, contact_person, contact_number, status, vehicles } = req.body;
    if (!name || !category || !contact_number) {
      return res.status(400).json({ error: 'Name, Category, and Contact Number are required.' });
    }

    const id = await getNextId('SUP');
    const supStatus = status || 'Active';

    await dbQuery(
      `INSERT INTO suppliers (id, name, category, company_name, contact_person, contact_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, category, company_name || null, contact_person || null, contact_number, supStatus]
    );

    // Save initial vehicle rate matrix if provided
    if (Array.isArray(vehicles)) {
      for (const v of vehicles) {
        if (v.vehicle_type && v.rate_per_trip !== undefined) {
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
});

// Update Supplier
app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, company_name, contact_person, contact_number, status } = req.body;

    await dbQuery(
      `UPDATE suppliers 
       SET name = $1, category = $2, company_name = $3, contact_person = $4, contact_number = $5, status = $6
       WHERE id = $7`,
      [name, category, company_name, contact_person, contact_number, status, id]
    );

    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Supplier
app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbQuery('DELETE FROM suppliers WHERE id = $1', [id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage Vehicles & Rates for a Supplier
app.get('/api/suppliers/:id/vehicles', async (req, res) => {
  try {
    const vehicles = await dbQuery('SELECT * FROM supplier_vehicles WHERE supplier_id = $1 ORDER BY vehicle_type', [req.params.id]);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers/:id/vehicles', async (req, res) => {
  try {
    const supplier_id = req.params.id;
    const { vehicle_type, rate_per_trip } = req.body;

    if (!vehicle_type || rate_per_trip === undefined) {
      return res.status(400).json({ error: 'Vehicle type and rate per trip are required.' });
    }

    const uuid = generateUuid();
    await dbQuery(
      `INSERT INTO supplier_vehicles (id, supplier_id, vehicle_type, rate_per_trip)
       VALUES ($1, $2, $3, $4)`,
      [uuid, supplier_id, vehicle_type, parseFloat(rate_per_trip)]
    );

    res.status(201).json({ id: uuid, message: 'Vehicle rate added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await dbQuery('DELETE FROM supplier_vehicles WHERE id = $1', [req.params.id]);
    res.json({ message: 'Vehicle rate deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// SM-02: MATERIAL RECEIPTS (GOODS INWARD)
// ==========================================

// Fetch Receipts
app.get('/api/receipts', async (req, res) => {
  try {
    const { supplier_id, material_type, status, date_from, date_to, search } = req.query;
    let query = `
      SELECT r.*, s.name as supplier_name, s.company_name, s.category as supplier_category
      FROM receipts r
      JOIN suppliers s ON r.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id && supplier_id !== 'All') {
      params.push(supplier_id);
      query += ` AND r.supplier_id = $${params.length}`;
    }

    if (material_type && material_type !== 'All') {
      params.push(material_type);
      query += ` AND r.material_type = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND r.receipt_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND r.receipt_date <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.id LIKE $${params.length} OR s.name LIKE $${params.length} OR r.vehicle_type LIKE $${params.length})`;
    }

    query += ` ORDER BY r.receipt_date DESC, r.created_at DESC`;

    const receipts = await dbQuery(query, params);
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Material Receipt (SM-02)
app.post('/api/receipts', async (req, res) => {
  try {
    const { supplier_id, material_type, vehicle_type, receipt_date, trip_count, rate_per_trip } = req.body;

    if (!supplier_id || !material_type || !vehicle_type || !trip_count || !rate_per_trip) {
      return res.status(400).json({ error: 'All fields (supplier, material type, vehicle type, trip count, rate per trip) are required.' });
    }

    const id = await getNextId('RCT');
    const trips = parseInt(trip_count, 10);
    const rate = parseFloat(rate_per_trip);
    const total_amount = trips * rate;
    const rDate = receipt_date || new Date().toISOString().split('T')[0];

    // Insert Receipt
    await dbQuery(
      `INSERT INTO receipts (id, supplier_id, material_type, vehicle_type, receipt_date, trip_count, rate_per_trip, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')`,
      [id, supplier_id, material_type, vehicle_type, rDate, trips, rate, total_amount]
    );

    // Auto-create Ledger Entry (Delivery Due)
    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, 'Delivery Due', $4, 'Owner Owes', $5)`,
      [
        generateUuid(),
        supplier_id,
        rDate,
        total_amount,
        `Material Receipt ${id} - ${trips} trip(s) of ${material_type} via ${vehicle_type}`
      ]
    );

    res.status(201).json({ id, total_amount, message: 'Material receipt recorded and added to ledger.' });
  } catch (error) {
    console.error('Error recording receipt:', error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// SM-03: SUPPLIER PAYMENT LEDGER
// ==========================================

// Get Ledger Transactions & Supplier Balances
app.get('/api/ledger', async (req, res) => {
  try {
    const { supplier_id } = req.query;
    let query = `
      SELECT l.*, s.name as supplier_name, s.company_name
      FROM supplier_ledger l
      JOIN suppliers s ON l.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id && supplier_id !== 'All') {
      params.push(supplier_id);
      query += ` AND l.supplier_id = $${params.length}`;
    }

    query += ` ORDER BY l.transaction_date DESC, l.created_at DESC`;

    const transactions = await dbQuery(query, params);

    // Compute metrics
    let totalDeliveryDue = 0;
    let totalAdvancePaid = 0;

    transactions.forEach(t => {
      if (t.balance_impact === 'Owner Owes') totalDeliveryDue += parseFloat(t.amount);
      if (t.balance_impact === 'Owner Paid') totalAdvancePaid += parseFloat(t.amount);
    });

    const netOutstanding = totalDeliveryDue - totalAdvancePaid;

    res.json({
      summary: {
        totalDeliveryDue,
        totalAdvancePaid,
        netOutstanding
      },
      transactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record Advance Payment (SM-03)
app.post('/api/ledger/advance', async (req, res) => {
  try {
    const { supplier_id, transaction_date, amount, note } = req.body;
    if (!supplier_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Supplier ID and a positive payment amount are required.' });
    }

    const tDate = transaction_date || new Date().toISOString().split('T')[0];
    const uuid = generateUuid();

    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, 'Advance Paid', $4, 'Owner Paid', $5)`,
      [uuid, supplier_id, tDate, parseFloat(amount), note || 'Supplier Advance Payment']
    );

    res.status(201).json({ id: uuid, message: 'Advance payment recorded successfully in ledger.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// SM-04: ACCOUNT SETTLEMENTS
// ==========================================

// Get Settlements History
app.get('/api/settlements', async (req, res) => {
  try {
    const { supplier_id } = req.query;
    let query = `
      SELECT st.*, s.name as supplier_name, s.company_name
      FROM settlements st
      JOIN suppliers s ON st.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id && supplier_id !== 'All') {
      params.push(supplier_id);
      query += ` AND st.supplier_id = $${params.length}`;
    }

    query += ` ORDER BY st.settlement_date DESC, st.created_at DESC`;

    const settlements = await dbQuery(query, params);
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process Account Settlement (SM-04)
app.post('/api/settlements', async (req, res) => {
  try {
    const { supplier_id, settlement_date, settlement_type, amount_paid, linked_invoices, note } = req.body;

    if (!supplier_id || !amount_paid || parseFloat(amount_paid) <= 0) {
      return res.status(400).json({ error: 'Supplier and payment amount are required.' });
    }

    const sId = await getNextId('STL');
    const sDate = settlement_date || new Date().toISOString().split('T')[0];
    const paid = parseFloat(amount_paid);
    const invoices = Array.isArray(linked_invoices) ? linked_invoices : [];

    // Calculate current supplier unpaid balance from receipts
    const pendingReceipts = await dbQuery(
      `SELECT * FROM receipts WHERE supplier_id = $1 AND status IN ('Pending', 'Partial')`,
      [supplier_id]
    );

    let totalPendingInvoices = 0;
    pendingReceipts.forEach(r => {
      totalPendingInvoices += parseFloat(r.total_amount);
    });

    const remaining_balance = Math.max(0, totalPendingInvoices - paid);

    // Insert Settlement record
    await dbQuery(
      `INSERT INTO settlements (id, supplier_id, settlement_date, settlement_type, amount_paid, remaining_balance, linked_invoices)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sId, supplier_id, sDate, settlement_type || 'Partial', paid, remaining_balance, invoices]
    );

    // Update status of linked receipts
    for (const rId of invoices) {
      const statusToSet = (settlement_type === 'Full Settlement') ? 'Settled' : 'Partial';
      await dbQuery(
        `UPDATE receipts SET status = $1 WHERE id = $2`,
        [statusToSet, rId]
      );
    }

    // Add entry to Ledger for the settlement payment made by Owner
    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, 'Advance Paid', $4, 'Owner Paid', $5)`,
      [
        generateUuid(),
        supplier_id,
        sDate,
        paid,
        `Account Settlement ${sId} (${settlement_type || 'Partial'}) - ${note || 'Invoices: ' + invoices.join(', ')}`
      ]
    );

    res.status(201).json({
      id: sId,
      remaining_balance,
      message: `Account Settlement ${sId} completed successfully.`
    });
  } catch (error) {
    console.error('Error processing settlement:', error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// DASHBOARD & OVERVIEW KPI STATS
// ==========================================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const suppliers = await dbQuery(`SELECT COUNT(*) as count FROM suppliers WHERE status = 'Active'`);
    const receipts = await dbQuery(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM receipts`);
    const pendingReceipts = await dbQuery(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM receipts WHERE status IN ('Pending', 'Partial')`);
    
    const ledger = await dbQuery(`
      SELECT 
        COALESCE(SUM(CASE WHEN balance_impact = 'Owner Owes' THEN amount ELSE 0 END), 0) as total_owes,
        COALESCE(SUM(CASE WHEN balance_impact = 'Owner Paid' THEN amount ELSE 0 END), 0) as total_paid
      FROM supplier_ledger
    `);

    const totalOwes = parseFloat(ledger[0]?.total_owes || 0);
    const totalPaid = parseFloat(ledger[0]?.total_paid || 0);
    const netOutstanding = totalOwes - totalPaid;

    const materialBreakdown = await dbQuery(`
      SELECT material_type, COUNT(*) as receipt_count, COALESCE(SUM(total_amount), 0) as total_val, COALESCE(SUM(trip_count), 0) as total_trips
      FROM receipts
      GROUP BY material_type
    `);

    res.json({
      activeSuppliersCount: parseInt(suppliers[0]?.count || 0, 10),
      totalReceiptsCount: parseInt(receipts[0]?.count || 0, 10),
      totalReceiptsValue: parseFloat(receipts[0]?.total || 0),
      pendingReceiptsCount: parseInt(pendingReceipts[0]?.count || 0, 10),
      pendingReceiptsValue: parseFloat(pendingReceipts[0]?.total || 0),
      totalOwnerOwes: totalOwes,
      totalOwnerPaid: totalPaid,
      netOutstandingBalance: netOutstanding,
      materialBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`[SERVER] Supplier Management ERP Server running on port ${PORT}`);
});
