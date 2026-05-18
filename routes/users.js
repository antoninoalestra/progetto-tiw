import express from 'express';
import { registerUser, loginUser } from '../controllers/userController.js';

const router = express.Router();

// Rotta per la registrazione dell'utente
router.post('/register', registerUser);

// Rotta per il login dell'utente
router.post('/login', loginUser);

export default router;
