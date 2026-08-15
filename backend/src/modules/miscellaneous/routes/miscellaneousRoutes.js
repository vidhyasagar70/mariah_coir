import express from 'express';
import {
  getMiscellaneousEntries,
  getMiscellaneousEntryById,
  createMiscellaneousEntry,
  updateMiscellaneousEntry,
  deleteMiscellaneousEntry
} from '../controllers/miscellaneousController.js';

const router = express.Router();

router.get('/', getMiscellaneousEntries);
router.get('/:id', getMiscellaneousEntryById);
router.post('/', createMiscellaneousEntry);
router.put('/:id', updateMiscellaneousEntry);
router.delete('/:id', deleteMiscellaneousEntry);

export default router;
