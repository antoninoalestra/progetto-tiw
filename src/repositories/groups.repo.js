// Repository per la gestione dei gruppi e dei loro membri

import db from '../db/connection.js';
import crypto from 'crypto';

// Genera un codice alfanumerico casuale di 6 caratteri per l'invito
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// Query precompilate

// I gruppi a cui partecipa l'utente
const stmtListForUser = db.prepare(`
  SELECT g.*,
         (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count
  FROM groups g
  JOIN group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = @userId
  ORDER BY g.created_at DESC
`);

// Singolo gruppo per ID
const stmtFindById = db.prepare('SELECT * FROM groups WHERE id = @id');

// Tutti i membri del gruppo
const stmtGetMembers = db.prepare(`
  SELECT u.id, u.name, u.email, gm.joined_at
  FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  WHERE gm.group_id = @groupId
  ORDER BY gm.joined_at ASC
`);

// I primi 4 membri (per l'interfaccia)
const stmtGetMembersPreview = db.prepare(`
  SELECT u.id, u.name
  FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  WHERE gm.group_id = @groupId
  ORDER BY gm.joined_at ASC
  LIMIT 4
`);

// Creazione gruppo
const stmtCreate = db.prepare(
  'INSERT INTO groups (name, description, invite_code, created_by) VALUES (@name, @description, @inviteCode, @createdBy)'
);

// Ricerca gruppo per invito
const stmtFindByInviteCode = db.prepare('SELECT * FROM groups WHERE invite_code = @code');

// Iscrizione al gruppo
const stmtAddMember = db.prepare(
  'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (@groupId, @userId)'
);

// Controllo appartenenza al gruppo
const stmtIsMember = db.prepare(
  'SELECT 1 FROM group_members WHERE group_id = @groupId AND user_id = @userId'
);

// Cancellazione (la foreign key gestisce a cascata i dati collegati)
const stmtDeleteGroup = db.prepare('DELETE FROM groups WHERE id = @id');

// Elenca i gruppi dell'utente e aggiunge un'anteprima dei membri
export function listForUser(userId) {
  const groups = stmtListForUser.all({ userId });
  // Arricchisci ogni gruppo con l'anteprima dei membri
  for (const group of groups) {
    group.members = stmtGetMembersPreview.all({ groupId: group.id });
  }
  return groups;
}

// Dettagli completi del gruppo e della sua lista membri
export function findById(id) {
  const group = stmtFindById.get({ id });
  if (group) {
    group.members = stmtGetMembers.all({ groupId: id });
  }
  return group;
}

// Crea il gruppo e genera subito il codice di invito
export function create(name, description, createdBy) {
  const inviteCode = generateInviteCode();
  const result = stmtCreate.run({ name, description, inviteCode, createdBy });
  return findById(Number(result.lastInsertRowid));
}

// Trova il gruppo usando il codice invito
export function findByInviteCode(code) {
  return stmtFindByInviteCode.get({ code });
}

// Aggiunge l'utente al gruppo
export function addMember(groupId, userId) {
  return stmtAddMember.run({ groupId, userId });
}

// Ritorna true se l'utente è nel gruppo
export function isMember(groupId, userId) {
  return stmtIsMember.get({ groupId, userId }) !== undefined;
}

// Elimina il gruppo (i dati collegati vengono rimossi a cascata da SQLite)
export function deleteGroup(id) {
  return stmtDeleteGroup.run({ id });
}
