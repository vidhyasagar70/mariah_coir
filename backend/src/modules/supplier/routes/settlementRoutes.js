import { Router } from 'express';
import {
  getSettlements,
  createSettlement
} from '../controllers/settlementController.js';

const router = Router();

router.get('/', getSettlements);
router.post('/', createSettlement);

export default router;
