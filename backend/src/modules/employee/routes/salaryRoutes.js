import express from 'express';
import {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary,
  calculateEmployeeSalary
} from '../controllers/salaryController.js';

const router = express.Router();

router.get('/', getSalaries);
router.get('/calculate/:employee_id', calculateEmployeeSalary);
router.get('/:id', getSalaryById);
router.post('/', createSalary);
router.put('/:id', updateSalary);
router.delete('/:id', deleteSalary);

export default router;
