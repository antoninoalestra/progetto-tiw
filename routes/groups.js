import express from 'express';
import { getGroupSettlements } from '../controllers/groupController.js';

const router = express.Router();

/**
 * Rotta per ottenere i rimborsi suggeriti (settlements) per un gruppo specifico.
 * Ritorna un array di oggetti: { debtorName, creditorName, amount }
 */
router.get('/:groupId/settlements', getGroupSettlements);

export default router;
