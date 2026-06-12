// Modulo di repository dedicato alla registrazione e gestione dei rimborsi tra utenti.
// Il tracciamento dei rimborsi è un componente essenziale per la compensazione dei bilanci all'interno del gruppo.

import db from '../db/connection.js';

// Definizione dei prepared statements per l'esecuzione ottimizzata delle query e la prevenzione di attacchi SQL injection.

const stmtCreate = db.prepare(`
  INSERT INTO reimbursements (group_id, from_user_id, to_user_id, amount)
  VALUES (@groupId, @fromUserId, @toUserId, @amount)
`);

const stmtListForGroup = db.prepare(`
  SELECT r.*,
         fu.name AS from_user_name,
         tu.name AS to_user_name
  FROM reimbursements r
  JOIN users fu ON r.from_user_id = fu.id
  JOIN users tu ON r.to_user_id = tu.id
  WHERE r.group_id = @groupId
  ORDER BY r.created_at DESC
`);

// Persistenza del record di rimborso nel database.
// Restituisce il DTO aggiornato per consentire al client di aggiornare l'interfaccia in tempo reale.
export function create(groupId, fromUserId, toUserId, amount) {
  const result = stmtCreate.run({ groupId, fromUserId, toUserId, amount });
  return {
    id: result.lastInsertRowid,
    groupId,
    fromUserId,
    toUserId,
    amount,
    createdAt: new Date().toISOString()
  };
}

// Recupero dello storico completo delle transazioni di rimborso associate a uno specifico gruppo.
// Funzione impiegata per la renderizzazione della view di dettaglio del gruppo.
export function listForGroup(groupId) {
  return stmtListForGroup.all({ groupId });
}
