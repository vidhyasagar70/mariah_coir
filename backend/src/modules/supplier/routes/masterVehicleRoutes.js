import { Router } from 'express';
import {
  getMasterVehicles,
  createMasterVehicle,
  deleteMasterVehicle
} from '../controllers/masterVehicleController.js';

const router = Router();

router.get('/', getMasterVehicles);
router.post('/', createMasterVehicle);
router.delete('/:id', deleteMasterVehicle);

export default router;
