// Calcolo dei saldi all'interno dei gruppi
// Gestisce sia la divisione in parti uguali che quella personalizzata

import db from '../db/connection.js';

// Query principale per il calcolo aggregato dei bilanci utente.
// Utilizza le Common Table Expressions (CTE) per disaccoppiare logicamente:
// il volume dei pagamenti, le quote dovute e i rimborsi storici.
const stmtGetBalances = db.prepare(`
  WITH 
  -- 1. Aggregazione dei versamenti fisici effettuati da ciascun utente
  pagato AS (
    SELECT paid_by AS user_id, SUM(amount) AS totale_pagato
    FROM expenses
    WHERE group_id = @groupId
    GROUP BY paid_by
  ),
  
  -- 2. Aggregazione delle quote dovute per ciascun partecipante alle spese.
  dovuto AS (
    SELECT ep.user_id,
           -- Priorità alla quota esplicita (share_amount). In sua assenza, calcola la quota 
           -- in parti uguali dividendo l'importo totale per il numero di partecipanti.
           SUM(COALESCE(ep.share_amount, e.amount / (
             SELECT COUNT(*) FROM expense_participants ep2
             WHERE ep2.expense_id = e.id
           ))) AS quota_dovuta
    FROM expenses e
    JOIN expense_participants ep ON ep.expense_id = e.id
    WHERE e.group_id = @groupId
    GROUP BY ep.user_id
  ),
  
  -- 3. Aggregazione dei fondi trasferiti ad altri utenti tramite rimborsi
  rimborsi_out AS (
    SELECT from_user_id AS user_id, SUM(amount) AS totale_inviato
    FROM reimbursements
    WHERE group_id = @groupId
    GROUP BY from_user_id
  ),
  
  -- 4. Aggregazione dei fondi ricevuti da altri utenti tramite rimborsi
  rimborsi_in AS (
    SELECT to_user_id AS user_id, SUM(amount) AS totale_ricevuto
    FROM reimbursements
    WHERE group_id = @groupId
    GROUP BY to_user_id
  )
  
  -- Calcolo finale del bilancio netto per ciascun membro del gruppo
  SELECT gm.user_id AS id, u.name,
         ROUND(
           COALESCE(p.totale_pagato, 0) - COALESCE(d.quota_dovuta, 0)
           + COALESCE(ro.totale_inviato, 0)
           - COALESCE(ri.totale_ricevuto, 0)
         , 2) AS saldo
  FROM group_members gm
  JOIN users u ON gm.user_id = u.id
  LEFT JOIN pagato p ON p.user_id = gm.user_id
  LEFT JOIN dovuto d ON d.user_id = gm.user_id
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

// Algoritmo per il calcolo delle compensazioni (rimborsi necessari per riequilibrare i saldi).
// Implementa un approccio greedy che divide gli utenti tra debitori e creditori,
// compensando progressivamente i saldi in ordine decrescente di importo per minimizzare il numero totale di transazioni.
export function calculateSettlements(balances) {
  const debtors = [];
  const creditors = [];

  // Suddivisione degli utenti nei rispettivi array in base alla natura del saldo
  for (const b of balances) {
    if (b.saldo < -0.001) debtors.push({ ...b, amount: Math.abs(b.saldo) });
    else if (b.saldo > 0.001) creditors.push({ ...b, amount: b.saldo });
  }

  // Ordinamento in ordine decrescente degli importi per ottimizzare le compensazioni
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let d = 0;
  let c = 0;

  // Iterazione per la risoluzione progressiva dei saldi pendenti
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    // L'importo da transare corrisponde al minimo tra il debito residuo e il credito atteso
    const amount = Math.min(debtor.amount, creditor.amount);

    // Registrazione della compensazione teorica calcolata
    settlements.push({
      from: debtor.name,
      fromId: debtor.id,
      to: creditor.name,
      toId: creditor.id,
      amount: Math.round(amount * 100) / 100
    });

    // Aggiornamento dei saldi residui a seguito della compensazione parziale o totale
    debtor.amount -= amount;
    creditor.amount -= amount;

    // Avanzamento dell'indice se il soggetto ha interamente pareggiato il proprio bilancio
    if (debtor.amount < 0.001) d++;
    if (creditor.amount < 0.001) c++;
  }

  return settlements;
}
