import express from 'express';
import { createGroup, getUserGroups, addUserToGroup } from '../controllers/groupController.js';

const router = express.Router();

// Rotta per creare un nuovo gruppo
router.post('/', createGroup);

// Rotta per ottenere i gruppi di un utente
router.get('/user/:userId', getUserGroups);

// Rotta per aggiungere un utente a un gruppo
router.post('/:groupId/members', addUserToGroup);

export default router;
