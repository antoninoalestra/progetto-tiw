// Gestione delle spese nel database
// Gestisce sia divisioni eque che personalizzate tramite share_amount

import db from '../db/connection.js';

// Query precompilate

// Tutte le spese di un gruppo con nome di chi ha pagato
const stmtListForGroup = db.prepare(`
  SELECT e.*, u.name AS payer_name
  FROM expenses e
  JOIN users u ON u.id = e.paid_by
  WHERE e.group_id = @groupId
  ORDER BY e.created_at DESC
`);

// Ultimi movimenti su tutti i gruppi per la dashboard
const stmtListRecentForUser = db.prepare(`
  SELECT e.*, u.name AS payer_name, g.name AS group_name
  FROM expenses e
  JOIN users u ON u.id = e.paid_by
  JOIN groups g ON g.id = e.group_id
  JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = @userId
  ORDER BY e.created_at DESC
  LIMIT @limit
`);

// Trova la spesa in base all'ID
const stmtFindById = db.prepare('SELECT * FROM expenses WHERE id = @id');

// Aggiunge la spesa
const stmtInsertExpense = db.prepare(`
  INSERT INTO expenses (group_id, paid_by, description, amount, category)
  VALUES (@groupId, @paidBy, @description, @amount, @category)
`);

// Collega la spesa a un utente, con la sua quota eventuale
const stmtInsertParticipant = db.prepare(
  'INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES (@expenseId, @userId, @shareAmount)'
);

// Ottiene l'elenco di chi ha partecipato alla spesa
const stmtGetParticipants = db.prepare(`
  SELECT u.id, u.name, ep.share_amount
  FROM expense_participants ep
  JOIN users u ON u.id = ep.user_id
  WHERE ep.expense_id = @expenseId
`);

// Raggruppa le spese di un gruppo per categoria (usato nei grafici)
const stmtGetCategoryStats = db.prepare(`
  SELECT category, SUM(amount) AS total, COUNT(*) AS count
  FROM expenses
  WHERE group_id = @groupId
  GROUP BY category
  ORDER BY total DESC
`);

// Totale spese complessivo dell'utente
const stmtGetTotalExpensesForUser = db.prepare(`
  SELECT COALESCE(SUM(e.amount), 0) AS total
  FROM expenses e
  JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = @userId
`);

// Elimina i collegamenti degli utenti per una spesa
const stmtDeleteParticipants = db.prepare('DELETE FROM expense_participants WHERE expense_id = @id');

// Elimina la spesa stessa
const stmtDeleteExpense = db.prepare('DELETE FROM expenses WHERE id = @id');

// --- Funzioni esportate ---

// Ritorna le spese del gruppo
export function listForGroup(groupId) {
  return stmtListForGroup.all({ groupId });
}

// Ritorna le spese recenti dell'utente per la dashboard
export function listRecentForUser(userId, limit = 10) {
  return stmtListRecentForUser.all({ userId, limit });
}

// Cerca una spesa e ci allega la lista dei partecipanti
export function findById(id) {
  const expense = stmtFindById.get({ id });
  if (expense) {
    expense.participants = stmtGetParticipants.all({ expenseId: id });
  }
  return expense;
}

// Ottiene le somme spese per categoria
export function getCategoryStats(groupId) {
  return stmtGetCategoryStats.all({ groupId });
}

// Somma tutto quello speso finora dall'utente nei suoi gruppi
export function getTotalExpensesForUser(userId) {
  const result = stmtGetTotalExpensesForUser.get({ userId });
  return result ? result.total : 0;
}

// Inserisce spesa e partecipanti all'interno di una transazione, supportando lo split custom
export const create = db.transaction((groupId, paidBy, description, amount, category, participantIds, shares) => {
  // Inserisci la spesa principale
  const result = stmtInsertExpense.run({
    groupId, paidBy, description, amount, category
  });

  const expenseId = Number(result.lastInsertRowid);

  // Inserisci ogni partecipante con eventuale importo personalizzato
  for (const userId of participantIds) {
    const shareAmount = shares ? (shares[userId] !== undefined ? shares[userId] : null) : null;
    stmtInsertParticipant.run({ expenseId, userId, shareAmount });
  }

  return findById(expenseId);
});

// Cancella la spesa (con transazione per rimuovere anche i partecipanti)
export const deleteById = db.transaction((id) => {
  stmtDeleteParticipants.run({ id });
  return stmtDeleteExpense.run({ id });
});
