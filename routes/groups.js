import express from 'express';
import { getGroupById } from '../controllers/groupController.js';

const router = express.Router();

// Rotta per ottenere un gruppo per ID
router.get('/:groupId', getGroupById);

export default router;
