import express from 'express';
import {
  getAttendance,
  getAttendanceById,
  createAttendance,
  bulkAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceReports
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/', getAttendance);
router.get('/reports', getAttendanceReports);
router.get('/:id', getAttendanceById);
router.post('/', createAttendance);
router.post('/bulk', bulkAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
