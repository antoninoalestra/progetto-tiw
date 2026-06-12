// Endpoint richiamati dal frontend via AJAX
// Tutte queste rotte richiedono un utente loggato

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

// Crea un nuovo gruppo
router.post('/groups', (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Il nome del gruppo è obbligatorio.' });
  }

  const group = groupsRepo.create(name.trim(), description?.trim() || null, req.session.userId);
  groupsRepo.addMember(group.id, req.session.userId);

  return res.json({ success: true, group });
});

// Iscrizione a un gruppo tramite codice invito
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

// Elimina un gruppo (solo chi lo ha creato può farlo)
router.post('/groups/:id/delete', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'ID gruppo non valido' });

  const group = groupsRepo.findById(groupId);
  if (!group) return res.status(404).json({ error: 'Gruppo non trovato' });

  // Controllo permessi
  if (group.created_by !== req.session.userId) {
    return res.status(403).json({ error: 'Solo l\'amministratore può eliminare il gruppo.' });
  }

  // Il database si occupa di ripulire le spese collegate tramite i vincoli a cascata
  groupsRepo.deleteGroup(groupId);
  return res.json({ success: true });
});

// Ritorna la lista dei membri di un gruppo (serve alla form delle spese)
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

// Restituisce i saldi ricalcolati per aggiornare l'interfaccia
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

// Dati per i grafici a torta delle spese
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

// Registra una nuova spesa
router.post('/expenses', (req, res) => {
  const { groupId, description, amount, category, participants, splitMode, shares } = req.body;
  const parsedGroupId = parseInt(groupId, 10);
  const parsedAmount = parseFloat(amount);

  // Validazione dei dati ricevuti
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

  // Determina chi ha partecipato alla spesa (tutti o solo alcuni scelti)
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

  // Se lo split non è in parti uguali, calcola le quote esatte fornite dall'utente
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
    // Controlla che le quote personalizzate sommino esattamente al totale della spesa
    if (Math.abs(sharesTotal - parsedAmount) > 0.01) {
      return res.status(400).json({
        error: `La somma delle quote (€${sharesTotal.toFixed(2)}) non corrisponde all'importo totale (€${parsedAmount.toFixed(2)}).`
      });
    }
  }

  // Salva tutto in una singola transazione nel database
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

// =============================================
// RIMBORSI
// =============================================

// Registra che un utente ha rimborsato un altro
router.post('/reimbursements', (req, res) => {
  const { groupId, toUserId, amount } = req.body;
  const parsedGroupId = parseInt(groupId, 10);
  const parsedToUserId = parseInt(toUserId, 10);
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedGroupId)) return res.status(400).json({ error: 'Gruppo non valido.' });
  if (isNaN(parsedToUserId)) return res.status(400).json({ error: 'Destinatario non valido.' });
  if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ error: 'L\'importo deve essere maggiore di zero.' });

  if (!groupsRepo.isMember(parsedGroupId, req.session.userId)) {
    return res.status(403).json({ error: 'Non sei membro di questo gruppo.' });
  }

  // Salva il rimborso (l'utente loggato è quello che paga)
  import('../repositories/reimbursements.repo.js').then(reimbursementsRepo => {
    try {
      const reimbursement = reimbursementsRepo.create(parsedGroupId, req.session.userId, parsedToUserId, parsedAmount);
      return res.json({ success: true, reimbursement });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Errore durante la registrazione del rimborso.' });
    }
  });
});

export default router;
