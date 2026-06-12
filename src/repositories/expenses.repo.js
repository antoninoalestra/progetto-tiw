// Modulo di repository per l'interazione con il database relativamente all'entità Expense (Spese).
// Gestisce l'inserimento, il recupero, la ripartizione dei costi e le statistiche categorizzate.

import db from '../db/connection.js';

// Definizione dei prepared statements per garantire efficienza di esecuzione e sicurezza da attacchi SQL injection.

// Recupero di tutte le spese associate a un gruppo, includendo i dettagli sull'utente pagante.
const stmtListForGroup = db.prepare(`
  SELECT e.*, u.name AS payer_name
  FROM expenses e
  JOIN users u ON u.id = e.paid_by
  WHERE e.group_id = @groupId
  ORDER BY e.created_at DESC
`);

// Recupero aggregato degli ultimi movimenti finanziari dell'utente, 
// indipendente dall'affiliazione ai gruppi. Utilizzato per popolare le dashboard riassuntive.
const stmtListRecentForUser = db.prepare(`
  SELECT e.*, u.name AS payer_name, g.name AS group_name
  FROM expenses e
  JOIN users u ON u.id = e.paid_by
  JOIN groups g ON g.id = e.group_id
  JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = @userId
  ORDER BY e.created_at DESC
  LIMIT @limit
`);

// Recupero di un singolo record di spesa tramite il suo identificatore univoco.
const stmtFindById = db.prepare('SELECT * FROM expenses WHERE id = @id');

// Inserimento del record master della spesa all'interno della tabella 'expenses'.
const stmtInsertExpense = db.prepare(`
  INSERT INTO expenses (group_id, paid_by, description, amount, category)
  VALUES (@groupId, @paidBy, @description, @amount, @category)
`);

// Inserimento dei partecipanti associati a una spesa. La colonna 'share_amount'
// gestisce la ripartizione personalizzata dell'importo.
const stmtInsertParticipant = db.prepare(
  'INSERT INTO expense_participants (expense_id, user_id, share_amount) VALUES (@expenseId, @userId, @shareAmount)'
);

// Recupero della lista di utenti che hanno partecipato a una specifica transazione economica.
const stmtGetParticipants = db.prepare(`
  SELECT u.id, u.name, ep.share_amount
  FROM expense_participants ep
  JOIN users u ON u.id = ep.user_id
  WHERE ep.expense_id = @expenseId
`);

// Aggregazione statistica dei volumi di spesa suddivisi per categoria.
// Utilizzato per alimentare i grafici analitici del frontend.
const stmtGetCategoryStats = db.prepare(`
  SELECT category, SUM(amount) AS total, COUNT(*) AS count
  FROM expenses
  WHERE group_id = @groupId
  GROUP BY category
  ORDER BY total DESC
`);

// Calcolo aggregato del volume totale delle spese relative all'utente.
// Utilizza la funzione COALESCE per restituire 0 in assenza di transazioni.
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

// Creazione strutturata di una spesa.
// L'operazione viene eseguita all'interno di una transazione SQL (db.transaction) per garantire l'atomicità
// durante l'inserimento multi-tabella (record in 'expenses' seguito da N record in 'expense_participants').
export const create = db.transaction((groupId, paidBy, description, amount, category, participantIds, shares) => {
  // 1. Inserisce la spesa principale
  const result = stmtInsertExpense.run({
    groupId, paidBy, description, amount, category
  });

  const expenseId = Number(result.lastInsertRowid);

  // 2. Per ogni partecipante inserisce una riga in expense_participants
  for (const userId of participantIds) {
    // shares è null → shareAmount sarà NULL nel DB (divisione equa)
    // shares ha un valore → shareAmount sarà il numero preciso (divisione custom)
    const shareAmount = shares ? (shares[userId] ?? null) : null;
    stmtInsertParticipant.run({ expenseId, userId, shareAmount });
  }

  return findById(expenseId);
});

// Cancella la spesa (con transazione per rimuovere anche i partecipanti)
export const deleteById = db.transaction((id) => {
  stmtDeleteParticipants.run({ id });
  return stmtDeleteExpense.run({ id });
});
