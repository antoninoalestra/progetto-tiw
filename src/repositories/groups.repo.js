// src/repositories/groups.repo.js
// Repository per la gestione dei gruppi nel database SQLite.
// Ogni funzione utilizza prepared statement compilati una sola volta.

import db from '../db/connection.js';
import crypto from 'crypto';

// --- Generazione codice invito a 6 caratteri alfanumerici ---
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// --- Prepared statement compilati all'avvio ---

// Recupera tutti i gruppi di cui un utente è membro
const stmtListForUser = db.prepare(`
  SELECT g.*,
         (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count
  FROM groups g
  JOIN group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = @userId
  ORDER BY g.created_at DESC
`);

// Recupera un singolo gruppo tramite ID
const stmtFindById = db.prepare('SELECT * FROM groups WHERE id = @id');

// Recupera i membri di un gruppo con le informazioni utente
const stmtGetMembers = db.prepare(`
  SELECT u.id, u.name, u.email, gm.joined_at
  FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  WHERE gm.group_id = @groupId
  ORDER BY gm.joined_at ASC
`);

// Anteprima primi 4 membri (per le card della dashboard)
const stmtGetMembersPreview = db.prepare(`
  SELECT u.id, u.name
  FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  WHERE gm.group_id = @groupId
  ORDER BY gm.joined_at ASC
  LIMIT 4
`);

// Inserisce un nuovo gruppo
const stmtCreate = db.prepare(
  'INSERT INTO groups (name, description, invite_code, created_by) VALUES (@name, @description, @inviteCode, @createdBy)'
);

// Cerca un gruppo tramite codice invito
const stmtFindByInviteCode = db.prepare('SELECT * FROM groups WHERE invite_code = @code');

// Aggiunge un membro al gruppo
const stmtAddMember = db.prepare(
  'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (@groupId, @userId)'
);

// Verifica se un utente è membro di un gruppo
const stmtIsMember = db.prepare(
  'SELECT 1 FROM group_members WHERE group_id = @groupId AND user_id = @userId'
);

// Elimina un gruppo (CASCADE gestisce group_members, expenses, expense_participants)
const stmtDeleteGroup = db.prepare('DELETE FROM groups WHERE id = @id');

// --- Funzioni esportate ---

/**
 * Restituisce la lista dei gruppi di cui l'utente è membro,
 * con il conteggio dei membri e l'anteprima dei primi 4 membri.
 */
export function listForUser(userId) {
  const groups = stmtListForUser.all({ userId });
  // Arricchisci ogni gruppo con l'anteprima dei membri
  for (const group of groups) {
    group.members = stmtGetMembersPreview.all({ groupId: group.id });
  }
  return groups;
}

/**
 * Restituisce un singolo gruppo tramite ID, includendo la lista completa dei membri.
 */
export function findById(id) {
  const group = stmtFindById.get({ id });
  if (group) {
    group.members = stmtGetMembers.all({ groupId: id });
  }
  return group;
}

/**
 * Crea un nuovo gruppo con codice invito a 6 caratteri.
 * Restituisce l'oggetto gruppo appena creato.
 */
export function create(name, description, createdBy) {
  const inviteCode = generateInviteCode();
  const result = stmtCreate.run({ name, description, inviteCode, createdBy });
  return findById(Number(result.lastInsertRowid));
}

/**
 * Cerca un gruppo tramite il codice di invito.
 */
export function findByInviteCode(code) {
  return stmtFindByInviteCode.get({ code });
}

/**
 * Aggiunge un utente come membro di un gruppo.
 */
export function addMember(groupId, userId) {
  return stmtAddMember.run({ groupId, userId });
}

/**
 * Verifica se un utente è membro di un gruppo.
 */
export function isMember(groupId, userId) {
  return stmtIsMember.get({ groupId, userId }) !== undefined;
}

/**
 * Elimina un gruppo. ON DELETE CASCADE rimuove automaticamente:
 * group_members, expenses, expense_participants.
 * Solo il creatore (admin) dovrebbe poter chiamare questa funzione.
 */
export function deleteGroup(id) {
  return stmtDeleteGroup.run({ id });
}
