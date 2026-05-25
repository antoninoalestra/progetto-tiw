// src/repositories/expenses.repo.js
// Repository per la gestione delle spese nel database SQLite.
// Supporta sia split equo che personalizzato tramite share_amount.

import db from '../db/connection.js';

// --- Prepared statement compilati all'avvio ---

// Spese di un gruppo con nome del pagante
const stmtListForGroup = db.prepare(`
  SELECT e.*, u.name AS payer_name
  FROM expenses e
  JOIN users u ON u.id = e.paid_by
  WHERE e.group_id = @groupId
  ORDER BY e.created_at DESC
`);

// Spese recenti dell'utente (cross-gruppo) per la dashboard
const stmtListRecentForUser = db.prepare(`
  SELECT e.*, u.name AS payer_name, g.name AS group_name
  FROM expenses e
  JOIN users u ON u.id = e.paid_by
  JOIN groups g ON g.id = e.group_id
  JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = @userId
  ORDER BY e.created_at DESC
  LIMIT @limit
`);

// Singola spesa per ID
const stmtFindById = db.prepare('SELECT * FROM expenses WHERE id = @id');

// Inserisce una nuova spesa
const stmtInsertExpense = db.prepare(`
  INSERT INTO expenses (group_id, paid_by, description, amount, category)
  VALUES (@groupId, @paidBy, @description, @amount, @category)
`);

// Inserisce un partecipante con eventuale importo personalizzato
const stmtInsertParticipant = db.prepare(
  'INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES (@expenseId, @userId, @shareAmount)'
);

// Partecipanti di una spesa
const stmtGetParticipants = db.prepare(`
  SELECT u.id, u.name, ep.share_amount
  FROM expense_participants ep
  JOIN users u ON u.id = ep.user_id
  WHERE ep.expense_id = @expenseId
`);

// Statistiche per categoria di un gruppo (per Chart.js)
const stmtGetCategoryStats = db.prepare(`
  SELECT category, SUM(amount) AS total, COUNT(*) AS count
  FROM expenses
  WHERE group_id = @groupId
  GROUP BY category
  ORDER BY total DESC
`);

// Somma totale delle spese in tutti i gruppi di un utente
const stmtGetTotalExpensesForUser = db.prepare(`
  SELECT COALESCE(SUM(e.amount), 0) AS total
  FROM expenses e
  JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = @userId
`);

// --- Funzioni esportate ---

/**
 * Restituisce la lista delle spese di un gruppo con il nome del pagante.
 */
export function listForGroup(groupId) {
  return stmtListForGroup.all({ groupId });
}

/**
 * Restituisce le spese recenti dell'utente (cross-gruppo) per la dashboard.
 */
export function listRecentForUser(userId, limit = 10) {
  return stmtListRecentForUser.all({ userId, limit });
}

/**
 * Restituisce una singola spesa con i partecipanti.
 */
export function findById(id) {
  const expense = stmtFindById.get({ id });
  if (expense) {
    expense.participants = stmtGetParticipants.all({ expenseId: id });
  }
  return expense;
}

/**
 * Restituisce le statistiche per categoria di un gruppo.
 * Usato da Chart.js per il grafico a torta.
 */
export function getCategoryStats(groupId) {
  return stmtGetCategoryStats.all({ groupId });
}

/**
 * Restituisce la somma totale delle spese in tutti i gruppi dell'utente.
 */
export function getTotalExpensesForUser(userId) {
  const result = stmtGetTotalExpensesForUser.get({ userId });
  return result ? result.total : 0;
}

/**
 * Crea una nuova spesa con i partecipanti.
 * @param {number} groupId - ID del gruppo
 * @param {number} paidBy - ID dell'utente che paga
 * @param {string} description - Descrizione della spesa
 * @param {number} amount - Importo totale
 * @param {string} category - Categoria
 * @param {number[]} participantIds - Array di ID partecipanti
 * @param {Object|null} shares - Mappa {userId: importo} per split custom (null = equo)
 */
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
