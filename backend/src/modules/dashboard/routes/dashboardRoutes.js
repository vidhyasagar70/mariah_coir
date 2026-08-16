import express from 'express';
import {
  getDashboardAnalytics,
  getExpenses,
  createExpense,
  deleteExpense
} from '../controllers/dashboardController.js';

const router = express.Router();

// Executive Analytics Route
router.get('/analytics', getDashboardAnalytics);

// Operational Expenses Routes
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.delete('/expenses/:id', deleteExpense);

export default router;
