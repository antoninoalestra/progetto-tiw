// src/routes/api.routes.js
// Endpoint JSON per le chiamate AJAX dal frontend.
// Gestisce: saldi live, stats, creazione gruppi/spese, join, delete gruppo.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as balancesRepo from '../repositories/balances.repo.js';
import * as groupsRepo from '../repositories/groups.repo.js';
import * as expensesRepo from '../repositories/expenses.repo.js';

const router = Router();
router.use(requireAuth);

// =============================================
// GRUPPI
// =============================================

// POST /api/groups — Crea un nuovo gruppo (chiamato dalla modale)
router.post('/groups', (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Il nome del gruppo è obbligatorio.' });
  }

  const group = groupsRepo.create(name.trim(), description?.trim() || null, req.session.userId);
  groupsRepo.addMember(group.id, req.session.userId);

  return res.json({ success: true, group });
});

// POST /api/groups/join — Unisciti a un gruppo (chiamato dalla modale)
router.post('/groups/join', (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode || inviteCode.trim().length === 0) {
    return res.status(400).json({ error: 'Il codice invito è obbligatorio.' });
  }

  const group = groupsRepo.findByInviteCode(inviteCode.trim().toUpperCase());
  if (!group) {
    return res.status(404).json({ error: 'Codice invito non valido.' });
  }

  if (groupsRepo.isMember(group.id, req.session.userId)) {
    return res.status(400).json({ error: 'Sei già membro di questo gruppo.' });
  }

  groupsRepo.addMember(group.id, req.session.userId);
  return res.json({ success: true, group });
});

// POST /api/groups/:id/delete — Elimina un gruppo (solo admin/creatore)
router.post('/groups/:id/delete', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'ID gruppo non valido' });

  const group = groupsRepo.findById(groupId);
  if (!group) return res.status(404).json({ error: 'Gruppo non trovato' });

  // Solo il creatore (admin) può eliminare il gruppo
  if (group.created_by !== req.session.userId) {
    return res.status(403).json({ error: 'Solo l\'amministratore può eliminare il gruppo.' });
  }

  // CASCADE si occupa di eliminare group_members, expenses, expense_participants
  groupsRepo.deleteGroup(groupId);
  return res.json({ success: true });
});

// GET /api/groups/:id/members — Lista membri (usata dal form spesa via AJAX)
router.get('/groups/:id/members', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'ID non valido' });

  if (!groupsRepo.isMember(groupId, req.session.userId)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const group = groupsRepo.findById(groupId);
  if (!group) return res.status(404).json({ error: 'Gruppo non trovato' });

  return res.json({ members: group.members });
});

// =============================================
// SALDI
// =============================================

// GET /api/groups/:id/balances — Saldi del gruppo (polling AJAX ogni 15s)
router.get('/groups/:id/balances', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'ID non valido' });

  if (!groupsRepo.isMember(groupId, req.session.userId)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const balances = balancesRepo.getBalances(groupId);
  return res.json({ balances });
});

// =============================================
// STATISTICHE
// =============================================

// GET /api/groups/:id/stats — Spese aggregate per categoria (per Chart.js)
router.get('/groups/:id/stats', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'ID non valido' });

  if (!groupsRepo.isMember(groupId, req.session.userId)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const stats = expensesRepo.getCategoryStats(groupId);
  return res.json({ stats });
});

// =============================================
// SPESE
// =============================================

// POST /api/expenses — Crea una nuova spesa (chiamato dalla modale)
router.post('/expenses', (req, res) => {
  const { groupId, description, amount, category, participants, splitMode, shares } = req.body;
  const parsedGroupId = parseInt(groupId, 10);
  const parsedAmount = parseFloat(amount);

  // Validazione
  if (isNaN(parsedGroupId)) {
    return res.status(400).json({ error: 'Gruppo non valido.' });
  }
  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: 'La descrizione è obbligatoria.' });
  }
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'L\'importo deve essere maggiore di zero.' });
  }
  if (!groupsRepo.isMember(parsedGroupId, req.session.userId)) {
    return res.status(403).json({ error: 'Non sei membro di questo gruppo.' });
  }

  // Gestione partecipanti
  let participantIds;
  if (participants && participants.length > 0) {
    participantIds = participants.map(Number);
  } else {
    const group = groupsRepo.findById(parsedGroupId);
    participantIds = group.members.map(m => m.id);
  }

  if (participantIds.length === 0) {
    return res.status(400).json({ error: 'Devi selezionare almeno un partecipante.' });
  }

  // Gestione split personalizzato
  let parsedShares = null;
  if (splitMode === 'custom' && shares) {
    parsedShares = {};
    let sharesTotal = 0;
    for (const [userId, shareAmount] of Object.entries(shares)) {
      const val = parseFloat(shareAmount);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ error: `Importo non valido per il partecipante ${userId}.` });
      }
      parsedShares[Number(userId)] = val;
      sharesTotal += val;
    }
    // Verifica che la somma degli importi personalizzati corrisponda al totale
    if (Math.abs(sharesTotal - parsedAmount) > 0.01) {
      return res.status(400).json({
        error: `La somma delle quote (€${sharesTotal.toFixed(2)}) non corrisponde all'importo totale (€${parsedAmount.toFixed(2)}).`
      });
    }
  }

  // Crea la spesa in modo atomico
  const expense = expensesRepo.create(
    parsedGroupId,
    req.session.userId,
    description.trim(),
    parsedAmount,
    category || 'Generale',
    participantIds,
    parsedShares
  );

  return res.json({ success: true, expense });
});

export default router;
