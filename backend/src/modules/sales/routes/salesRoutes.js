import express from 'express';
import {
  getSalesDispatches,
  getSalesDispatchById,
  createSalesDispatch,
  updateSalesDispatch,
  deleteSalesDispatch
} from '../controllers/salesDispatchController.js';
import {
  getSalesReportSummary
} from '../controllers/salesReportController.js';

const router = express.Router();

// Sales Dispatch Outbound Routes
router.get('/dispatches', getSalesDispatches);
router.get('/dispatches/:id', getSalesDispatchById);
router.post('/dispatches', createSalesDispatch);
router.put('/dispatches/:id', updateSalesDispatch);
router.delete('/dispatches/:id', deleteSalesDispatch);

// Sales Reports Routes
router.get('/reports/summary', getSalesReportSummary);

export default router;
