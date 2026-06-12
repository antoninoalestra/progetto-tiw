// Salvataggio dei rimborsi effettuati tra gli utenti

import db from '../db/connection.js';

// Query precompilate
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

// Salva il rimborso nel database
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

// Mostra tutti i rimborsi storici per il gruppo
export function listForGroup(groupId) {
  return stmtListForGroup.all({ groupId });
}
