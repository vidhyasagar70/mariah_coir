import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, dbQuery } from './config/db.js';
import { seedData } from '../seed.js';

import maintenanceRoutes from './modules/maintenance/routes/maintenanceRoutes.js';
import miscellaneousRoutes from './modules/miscellaneous/routes/miscellaneousRoutes.js';
import positionRoutes from './modules/employee/routes/positionRoutes.js';
import genderRoutes from './modules/employee/routes/genderRoutes.js';
import shiftRoutes from './modules/employee/routes/shiftRoutes.js';
import employeeRoutes from './modules/employee/routes/employeeRoutes.js';
import salaryRoutes from './modules/employee/routes/salaryRoutes.js';
import attendanceRoutes from './modules/employee/routes/attendanceRoutes.js';
import supplyRoutes from './modules/supply/routes/supplyRoutes.js';
import supplierManagementRoutes from './modules/supplier/routes/supplierManagementRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount API Routers
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/miscellaneous', miscellaneousRoutes);

app.use('/api/positions', positionRoutes);
app.use('/api/genders', genderRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/supply', supplyRoutes);
app.use('/api/supplier-management', supplierManagementRoutes);

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
  const existing = await dbQuery('SELECT COUNT(*) as count FROM positions');
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
