import express from 'express';
import { registerUser, loginUser, updateUser, getUserBalances } from '../controllers/userController.js';

const router = express.Router();

// Rotta per la registrazione dell'utente
router.post('/register', registerUser);

// Rotta per il login dell'utente
router.post('/login', loginUser);

// Rotta per aggiornare i dati dell'utente
router.put('/:id', updateUser);

// Rotta per ottenere il riepilogo saldi dell'utente
router.get('/:userId/balances', getUserBalances);

export default router;

