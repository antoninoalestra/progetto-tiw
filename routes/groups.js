import express from 'express';
import { getGroupById, getGroupSettlements, getUserGroups, createGroup, joinGroup, removeMember, exportGroupPdf, deleteGroup } from '../controllers/groupController.js';

const router = express.Router();

// Rotta per esportare il PDF (diventa POST per accettare il Base64 del grafico)
router.post('/:groupId/export', exportGroupPdf);

// Rotta per eliminare (chiudere) un gruppo
router.delete('/:groupId', deleteGroup);

// Rotta per creare un nuovo gruppo
router.post('/', createGroup);

// Rotta per unirsi a un gruppo tramite inviteCode
router.post('/join', joinGroup);

// Rotta per rimuovere un membro dal gruppo
router.delete('/:groupId/members/:memberId', removeMember);

// Rotta per ottenere i gruppi di un utente specifico
router.get('/user/:userId', getUserGroups);

// Rotta per ottenere un gruppo per ID
router.get('/:groupId', getGroupById);

// Rotta per ottenere i rimborsi (suggeriti e passati) di un gruppo
router.get('/:groupId/settlements', getGroupSettlements);

export default router;
