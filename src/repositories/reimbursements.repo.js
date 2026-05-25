// src/repositories/reimbursements.repo.js
// Repository per la registrazione dei rimborsi espliciti.

import db from '../db/connection.js';

// Query preparate
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

/**
 * Registra un nuovo rimborso.
 */
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

/**
 * Elenca i rimborsi registrati in un gruppo.
 */
export function listForGroup(groupId) {
  return stmtListForGroup.all({ groupId });
}
