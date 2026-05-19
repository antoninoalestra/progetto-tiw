import express from 'express';
import { getGroupById, getGroupSettlements } from '../controllers/groupController.js';

const router = express.Router();

// Rotta per ottenere un gruppo per ID
router.get('/:groupId', getGroupById);

// Rotta per ottenere i rimborsi (suggeriti e passati) di un gruppo
router.get('/:groupId/settlements', getGroupSettlements);

export default router;
