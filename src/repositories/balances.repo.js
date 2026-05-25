// src/repositories/balances.repo.js
// Repository per il calcolo dei saldi.
// Supporta sia split equo (share_amount NULL) che personalizzato.

import db from '../db/connection.js';

// CTE che calcola i saldi di ogni membro di un gruppo.
// Usa COALESCE: se share_amount è impostato (split custom), lo usa;
// altrimenti calcola la quota equa (importo / numero partecipanti).
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
  )
  SELECT u.id, u.name,
         ROUND(totale_pagato - quota_dovuta, 2) AS saldo
  FROM pagamenti p
  JOIN users u ON u.id = p.user_id
  ORDER BY saldo DESC
`);

/**
 * Calcola i saldi di tutti i membri di un gruppo.
 * saldo > 0 → credito (gli devono soldi)
 * saldo < 0 → debito (deve soldi)
 */
export function getBalances(groupId) {
  return stmtGetBalances.all({ groupId });
}

/**
 * Calcola i dati aggregati per la dashboard dell'utente.
 * Itera su ogni gruppo dell'utente e calcola il saldo individuale.
 * Restituisce: netBalance, totalCredit, totalOwed, details per gruppo.
 */
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

/**
 * Calcola i rimborsi esatti (chi deve a chi) basandosi sui saldi netti.
 * Algoritmo greedy che accoppia i maggiori debitori ai maggiori creditori.
 */
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
