import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, dbQuery } from './config/db.js';
import { seedData } from '../seed.js';

import supplierRoutes from './modules/supplier/routes/supplierRoutes.js';
import receiptRoutes from './modules/supplier/routes/receiptRoutes.js';
import ledgerRoutes from './modules/supplier/routes/ledgerRoutes.js';
import settlementRoutes from './modules/supplier/routes/settlementRoutes.js';
import masterVehicleRoutes from './modules/supplier/routes/masterVehicleRoutes.js';
import maintenanceRoutes from './modules/maintenance/routes/maintenanceRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount API Routers
app.use('/api/suppliers', supplierRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/master-vehicles', masterVehicleRoutes);
app.use('/api/maintenance', maintenanceRoutes);

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

// Root Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Coir Manufacturing ERP API Server Running on Port ' + PORT });
});

// Initialize Database & Start Server with Error Handling
initDb().then(async () => {
  console.log('[SERVER] Database Initialized.');
  const existing = await dbQuery('SELECT COUNT(*) as count FROM suppliers');
  const count = parseInt(existing[0]?.count || existing[0]?.['COUNT(*)'] || 0, 10);
  if (count === 0) {
    console.log('[SERVER] Database empty. Populating initial seed data...');
    await seedData();
  }

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] Express API backend listening on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[SERVER ERROR] Port ${PORT} is already in use by another process.`);
      console.error(`Please stop any background node process or run: npx kill-port 5000\n`);
      process.exit(1);
    } else {
      console.error('[SERVER ERROR]', err);
    }
  });
}).catch(err => {
  console.error('[SERVER] Failed to initialize DB:', err);
});
