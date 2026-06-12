// Pagine relative alla creazione delle spese
// Tutte le rotte sono protette da login

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as expensesRepo from '../repositories/expenses.repo.js';
import * as groupsRepo from '../repositories/groups.repo.js';

const router = Router();

// Proteggiamo tutto il router
router.use(requireAuth);

// Mostra il form per aggiungere una spesa
router.get('/new', (req, res, next) => {
  const groupId = parseInt(req.query.groupId, 10);
  if (isNaN(groupId)) {
    req.session.flash = { type: 'error', message: 'Gruppo non specificato.' };
    return res.redirect('/groups');
  }

  // Assicuriamoci che l'utente faccia parte del gruppo
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

// Riceve i dati del form e crea la spesa
router.post('/', (req, res) => {
  const { groupId, description, amount, category, participants } = req.body;
  const parsedGroupId = parseInt(groupId, 10);
  const parsedAmount = parseFloat(amount);

  // Verifica che i dati obbligatori siano corretti
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

  // Verifica appartenenza al gruppo
  if (!groupsRepo.isMember(parsedGroupId, req.session.userId)) {
    req.session.flash = { type: 'error', message: 'Non sei membro di questo gruppo.' };
    return res.redirect('/groups');
  }

  // Se non si selezionano partecipanti espliciti, partecipano tutti i membri del gruppo
  let participantIds;
  if (participants) {
    // Trasforma i partecipanti in un array di numeri
    participantIds = Array.isArray(participants)
      ? participants.map(Number)
      : [Number(participants)];
  } else {
    // Recupera tutti i membri
    const group = groupsRepo.findById(parsedGroupId);
    participantIds = group.members.map(m => m.id);
  }

  // Ci deve essere almeno qualcuno che paga
  if (participantIds.length === 0) {
    req.session.flash = { type: 'error', message: 'Devi selezionare almeno un partecipante.' };
    return res.redirect(`/expenses/new?groupId=${parsedGroupId}`);
  }

  // Salva la spesa nel database
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

// Elimina una spesa esistente
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

  // Solo chi ha pagato (il creatore della spesa) può eliminarla
  if (expense.paid_by !== req.session.userId) {
    req.session.flash = { type: 'error', message: 'Non sei autorizzato a eliminare questa spesa. Solo chi l\'ha creata può farlo.' };
    return res.redirect(`/groups/${expense.group_id}`);
  }

  expensesRepo.deleteById(expenseId);

  req.session.flash = { type: 'success', message: 'Spesa eliminata con successo!' };
  return res.redirect(`/groups/${expense.group_id}`);
});

export default router;
