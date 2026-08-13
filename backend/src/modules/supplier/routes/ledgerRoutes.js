import { Router } from 'express';
import {
  getLedgerTransactions,
  createLedgerEntry,
  getLedgerSummary
} from '../controllers/ledgerController.js';

const router = Router();

router.get('/', getLedgerTransactions);
router.post('/', createLedgerEntry);
router.get('/summary/:supplierId?', getLedgerSummary);

export default router;
