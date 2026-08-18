import express from 'express';
import {
  getDustMaster,
  getDustMasterById,
  createDustMaster,
  updateDustMaster,
  deleteDustMaster
} from '../controllers/dustMasterController.js';
import {
  getDustCustomers,
  getDustCustomerById,
  createDustCustomer,
  updateDustCustomer,
  deleteDustCustomer
} from '../controllers/dustCustomerController.js';
import {
  getDustSales,
  getDustSaleById,
  createDustSale,
  deleteDustSale
} from '../controllers/dustSalesController.js';
import {
  getCustomerSummaryReport,
  getCustomerLedgerStatement
} from '../controllers/dustReportController.js';

const router = express.Router();

// Dust Master Routes
router.get('/master', getDustMaster);
router.get('/master/:id', getDustMasterById);
router.post('/master', createDustMaster);
router.put('/master/:id', updateDustMaster);
router.delete('/master/:id', deleteDustMaster);

// Dust Customer Routes
router.get('/customers', getDustCustomers);
router.get('/customers/:id', getDustCustomerById);
router.post('/customers', createDustCustomer);
router.put('/customers/:id', updateDustCustomer);
router.delete('/customers/:id', deleteDustCustomer);

// Dust Sales Routes
router.get('/sales', getDustSales);
router.get('/sales/:id', getDustSaleById);
router.post('/sales', createDustSale);
router.delete('/sales/:id', deleteDustSale);

// Dust Report Routes
router.get('/reports/customer-summary', getCustomerSummaryReport);
router.get('/reports/customer-ledger/:customerId', getCustomerLedgerStatement);

export default router;
