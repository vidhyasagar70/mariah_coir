import { Router } from 'express';
import {
  getMaintenanceLogs,
  createMaintenanceLog,
  deleteMaintenanceLog
} from '../controllers/maintenanceController.js';

const router = Router();

router.get('/', getMaintenanceLogs);
router.post('/', createMaintenanceLog);
router.delete('/:id', deleteMaintenanceLog);

export default router;
