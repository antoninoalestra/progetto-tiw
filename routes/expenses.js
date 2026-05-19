import express from 'express';
import { addExpense, getGroupExpenses } from '../controllers/expenseController.js';

const router = express.Router();

// Rotta per aggiungere una nuova spesa
router.post('/', addExpense);

// Rotta per ottenere le spese di un gruppo specifico
router.get('/group/:groupId', getGroupExpenses);

export default router;
