import express from 'express';
import { addSettlement } from '../controllers/settlementController.js';

const router = express.Router();

/**
 * @route POST /api/settlements
 * @desc Crea un nuovo rimborso per saldare un debito
 */
router.post('/', addSettlement);

export default router;
