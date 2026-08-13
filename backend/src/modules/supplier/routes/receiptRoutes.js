import { Router } from 'express';
import {
  getReceipts,
  createReceipt,
  getPendingReceiptsBySupplier
} from '../controllers/receiptController.js';

const router = Router();

router.get('/', getReceipts);
router.post('/', createReceipt);
router.get('/pending/:supplierId', getPendingReceiptsBySupplier);

export default router;
