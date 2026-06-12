// Controller di routing per la gestione delle interfacce relative alle entità Expense.
// Fornisce i form per l'inserimento e processa l'eliminazione delle transazioni.
// Tutti gli endpoint richiedono preventiva autenticazione.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as expensesRepo from '../repositories/expenses.repo.js';
import * as groupsRepo from '../repositories/groups.repo.js';

const router = Router();

// Applicazione del middleware di autorizzazione all'intero router
router.use(requireAuth);

// Endpoint (GET) per la visualizzazione del modulo di inserimento spesa.
router.get('/new', (req, res, next) => {
  const groupId = parseInt(req.query.groupId, 10);
  if (isNaN(groupId)) {
    req.session.flash = { type: 'error', message: 'Gruppo non specificato.' };
    return res.redirect('/groups');
  }

  // Controllo autorizzativo: verifica l'affiliazione dell'utente al gruppo target
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

// Endpoint (POST) per la sottomissione del modulo di creazione spesa.
// Processa i dati provenienti da una form-urlencoded standard,
// applicando implicitamente un riparto equo (splitMode: equal).
router.post('/', (req, res) => {
  const { groupId, description, amount, category, participants } = req.body;
  const parsedGroupId = parseInt(groupId, 10);
  const parsedAmount = parseFloat(amount);

  // Validazione dei campi obbligatori e controllo integrità dei dati in ingresso
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

  // Controllo di affiliazione al gruppo per prevenire inserimenti non autorizzati
  if (!groupsRepo.isMember(parsedGroupId, req.session.userId)) {
    req.session.flash = { type: 'error', message: 'Non sei membro di questo gruppo.' };
    return res.redirect('/groups');
  }

  // Risoluzione dell'array di partecipanti. In assenza di selezione esplicita,
  // la transazione viene ripartita sull'intero pool di membri.
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

  // Persistenza della transazione tramite il modulo di repository dedicato
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

// Endpoint (POST) per la rimozione logico-fisica di una transazione esistente.
// Sottoposto a stringenti controlli di Ownership.
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

  // Controllo di Ownership: l'eliminazione è consentita esclusivamente all'utente 
  // che ha originariamente registrato il pagamento.
  if (expense.paid_by !== req.session.userId) {
    req.session.flash = { type: 'error', message: 'Non sei autorizzato a eliminare questa spesa. Solo chi l\'ha creata può farlo.' };
    return res.redirect(`/groups/${expense.group_id}`);
  }

  expensesRepo.deleteById(expenseId);

  req.session.flash = { type: 'success', message: 'Spesa eliminata con successo!' };
  return res.redirect(`/groups/${expense.group_id}`);
});

export default router;
