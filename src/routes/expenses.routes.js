// src/routes/expenses.routes.js
// Rotte per la gestione delle spese: form e creazione.
// Tutte le rotte sono protette dal middleware requireAuth.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as expensesRepo from '../repositories/expenses.repo.js';
import * as groupsRepo from '../repositories/groups.repo.js';

const router = Router();

// Tutte le rotte richiedono autenticazione
router.use(requireAuth);

// GET /expenses/new?groupId=X — Mostra il form per creare una nuova spesa
router.get('/new', (req, res, next) => {
  const groupId = parseInt(req.query.groupId, 10);
  if (isNaN(groupId)) {
    req.session.flash = { type: 'error', message: 'Gruppo non specificato.' };
    return res.redirect('/groups');
  }

  // Controllo autorizzazione: l'utente deve essere membro del gruppo
  if (!groupsRepo.isMember(groupId, req.session.userId)) {
    return res.status(403).render('errors/404', {
      title: 'Accesso negato',
      message: 'Non sei membro di questo gruppo.'
    });
  }

  const group = groupsRepo.findById(groupId);
  if (!group) return next();

  res.render('expenses/form', {
    title: 'Nuova Spesa',
    group
  });
});

// POST /expenses — Crea una nuova spesa
router.post('/', (req, res) => {
  const { groupId, description, amount, category, participants } = req.body;
  const parsedGroupId = parseInt(groupId, 10);
  const parsedAmount = parseFloat(amount);

  // Validazione campi obbligatori
  if (isNaN(parsedGroupId)) {
    req.session.flash = { type: 'error', message: 'Gruppo non valido.' };
    return res.redirect('/groups');
  }

  if (!description || description.trim().length === 0) {
    req.session.flash = { type: 'error', message: 'La descrizione è obbligatoria.' };
    return res.redirect(`/expenses/new?groupId=${parsedGroupId}`);
  }

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    req.session.flash = { type: 'error', message: 'L\'importo deve essere maggiore di zero.' };
    return res.redirect(`/expenses/new?groupId=${parsedGroupId}`);
  }

  // Controllo autorizzazione: l'utente deve essere membro del gruppo
  if (!groupsRepo.isMember(parsedGroupId, req.session.userId)) {
    req.session.flash = { type: 'error', message: 'Non sei membro di questo gruppo.' };
    return res.redirect('/groups');
  }

  // Gestione partecipanti: se non specificati, usa tutti i membri del gruppo
  let participantIds;
  if (participants) {
    // participants può essere un singolo valore o un array
    participantIds = Array.isArray(participants)
      ? participants.map(Number)
      : [Number(participants)];
  } else {
    // Se non specificati, tutti i membri del gruppo partecipano
    const group = groupsRepo.findById(parsedGroupId);
    participantIds = group.members.map(m => m.id);
  }

  // Validazione: almeno un partecipante
  if (participantIds.length === 0) {
    req.session.flash = { type: 'error', message: 'Devi selezionare almeno un partecipante.' };
    return res.redirect(`/expenses/new?groupId=${parsedGroupId}`);
  }

  // Crea la spesa in modo atomico (spesa + partecipanti in transazione)
  expensesRepo.create(
    parsedGroupId,
    req.session.userId,
    description.trim(),
    parsedAmount,
    category || 'altro',
    participantIds
  );

  req.session.flash = { type: 'success', message: 'Spesa aggiunta con successo!' };
  return res.redirect(`/groups/${parsedGroupId}`);
});

// POST /expenses/:id/delete — Elimina una spesa
router.post('/:id/delete', (req, res) => {
  const expenseId = parseInt(req.params.id, 10);
  
  if (isNaN(expenseId)) {
    req.session.flash = { type: 'error', message: 'ID spesa non valido.' };
    return res.redirect('/groups');
  }

  const expense = expensesRepo.findById(expenseId);
  if (!expense) {
    req.session.flash = { type: 'error', message: 'Spesa non trovata.' };
    return res.redirect('/groups');
  }

  // Controllo autorizzazione: l'utente deve essere il creatore della spesa
  if (expense.paid_by !== req.session.userId) {
    req.session.flash = { type: 'error', message: 'Non sei autorizzato a eliminare questa spesa. Solo chi l\'ha creata può farlo.' };
    return res.redirect(`/groups/${expense.group_id}`);
  }

  expensesRepo.deleteById(expenseId);

  req.session.flash = { type: 'success', message: 'Spesa eliminata con successo!' };
  return res.redirect(`/groups/${expense.group_id}`);
});

export default router;
