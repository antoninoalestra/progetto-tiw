// Calcolo dei saldi all'interno dei gruppi
// Gestisce sia la divisione in parti uguali che quella personalizzata

import db from '../db/connection.js';

// Query principale per ottenere il saldo di ogni partecipante.
// Se l'importo personalizzato (share_amount) non c'è, divide la spesa in parti uguali.
const stmtGetBalances = db.prepare(`
  WITH pagamenti AS (
    SELECT ep.user_id,
           SUM(COALESCE(ep.share_amount, e.amount / (
             SELECT COUNT(*) FROM expense_participants ep2
             WHERE ep2.expense_id = e.id
           ))) AS quota_dovuta,
           SUM(CASE WHEN e.paid_by = ep.user_id
             THEN e.amount ELSE 0 END) AS totale_pagato
    FROM expenses e
    JOIN expense_participants ep ON ep.expense_id = e.id
    WHERE e.group_id = @groupId
    GROUP BY ep.user_id
  ),
  rimborsi_out AS (
    SELECT from_user_id AS user_id, SUM(amount) AS totale_inviato
    FROM reimbursements
    WHERE group_id = @groupId
    GROUP BY from_user_id
  ),
  rimborsi_in AS (
    SELECT to_user_id AS user_id, SUM(amount) AS totale_ricevuto
    FROM reimbursements
    WHERE group_id = @groupId
    GROUP BY to_user_id
  )
  SELECT gm.user_id AS id, u.name,
         ROUND(
           COALESCE(p.totale_pagato, 0) - COALESCE(p.quota_dovuta, 0)
           + COALESCE(ro.totale_inviato, 0)
           - COALESCE(ri.totale_ricevuto, 0)
         , 2) AS saldo
  FROM group_members gm
  JOIN users u ON gm.user_id = u.id
  LEFT JOIN pagamenti p ON p.user_id = gm.user_id
  LEFT JOIN rimborsi_out ro ON ro.user_id = gm.user_id
  LEFT JOIN rimborsi_in ri ON ri.user_id = gm.user_id
  WHERE gm.group_id = @groupId
  ORDER BY saldo DESC
`);

// Recupera i saldi per il gruppo (positivo = deve ricevere, negativo = deve pagare)
export function getBalances(groupId) {
  return stmtGetBalances.all({ groupId });
}

// Genera i dati riassuntivi della dashboard aggregando tutti i gruppi dell'utente
export function getUserDashboardData(userId, groups) {
  let totalCredit = 0;
  let totalOwed = 0;
  const details = [];

  for (const group of groups) {
    const balances = getBalances(group.id);
    const userBalance = balances.find(b => b.id === userId);
    const saldo = userBalance ? userBalance.saldo : 0;

    if (saldo > 0) {
      totalCredit += saldo;
    } else {
      totalOwed += Math.abs(saldo);
    }

    details.push({
      groupId: group.id,
      groupName: group.name,
      saldo
    });
  }

  return {
    totalCredit: Math.round(totalCredit * 100) / 100,
    totalOwed: Math.round(totalOwed * 100) / 100,
    netBalance: Math.round((totalCredit - totalOwed) * 100) / 100,
    details
  };
}

// Algoritmo greedy per calcolare chi deve pagare chi in base ai saldi netti
export function calculateSettlements(balances) {
  const debtors = [];
  const creditors = [];

  for (const b of balances) {
    if (b.saldo < -0.001) debtors.push({ ...b, amount: Math.abs(b.saldo) });
    else if (b.saldo > 0.001) creditors.push({ ...b, amount: b.saldo });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.name,
      fromId: debtor.id,
      to: creditor.name,
      toId: creditor.id,
      amount: Math.round(amount * 100) / 100
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.001) d++;
    if (creditor.amount < 0.001) c++;
  }

  return settlements;
}
