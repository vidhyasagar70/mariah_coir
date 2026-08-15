import express from 'express';
import {
  getGenders,
  getGenderById,
  createGender,
  updateGender,
  deleteGender
} from '../controllers/genderController.js';

const router = express.Router();

router.get('/', getGenders);
router.get('/:id', getGenderById);
router.post('/', createGender);
router.put('/:id', updateGender);
router.delete('/:id', deleteGender);

export default router;
