// Modulo di repository dedicato alla persistenza e gestione dell'entità Group.
// Svolge le operazioni CRUD di base e modella le affiliazioni (group_members).

import db from '../db/connection.js';
import crypto from 'crypto';

// Generazione di un token alfanumerico univoco di 6 caratteri 
// utilizzato come codice d'invito condivisibile per il gruppo.
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

// Recupero di tutti i gruppi associati a un determinato utente.
// Include una subquery per il calcolo in tempo reale del numero dei partecipanti (member_count).
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

// Recupero dei dettagli anagrafici completi di tutti i membri affiliati al gruppo.
const stmtGetMembers = db.prepare(`
  SELECT u.id, u.name, u.email, gm.joined_at
  FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  WHERE gm.group_id = @groupId
  ORDER BY gm.joined_at ASC
`);

// Recupero parziale dei membri del gruppo (limitato a 4 record).
// Funzione ottimizzata per generare le preview dell'interfaccia utente (componenti avatar).
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

// Inserimento di un utente nella tabella di giunzione group_members.
// La direttiva OR IGNORE previene violazioni di vincoli UNIQUE in caso di inserimenti duplicati.
const stmtAddMember = db.prepare(
  'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (@groupId, @userId)'
);

// Controllo appartenenza al gruppo
const stmtIsMember = db.prepare(
  'SELECT 1 FROM group_members WHERE group_id = @groupId AND user_id = @userId'
);

// Eliminazione logica del gruppo. Grazie al vincolo ON DELETE CASCADE sulle tabelle dipendenti,
// SQLite gestirà autonomamente la pulizia di record collegati (spese, membri, rimborsi).
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
