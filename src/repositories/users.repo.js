// src/repositories/users.repo.js
// Repository per la gestione degli utenti nel database SQLite.
// Tutte le query usano prepared statement compilati una volta sola
// per evitare ricompilazione ad ogni chiamata.

import db from '../db/connection.js';

// Prepared statement compilati all'avvio del modulo
const stmtFindByEmail = db.prepare('SELECT * FROM users WHERE email = @email');
const stmtFindById = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = @id');
const stmtCreate = db.prepare(
  'INSERT INTO users (name, email, password_hash) VALUES (@name, @email, @passwordHash)'
);

/**
 * Cerca un utente tramite email.
 * Restituisce l'oggetto utente completo (incluso password_hash) o undefined.
 */
export function findByEmail(email) {
  return stmtFindByEmail.get({ email });
}

/**
 * Cerca un utente tramite ID.
 * Restituisce l'oggetto utente (senza password_hash) o undefined.
 */
export function findById(id) {
  return stmtFindById.get({ id });
}

/**
 * Crea un nuovo utente nel database.
 * Restituisce il risultato dell'inserimento (contiene lastInsertRowid).
 */
export function create(name, email, passwordHash) {
  return stmtCreate.run({ name, email, passwordHash });
}

const stmtUpdateProfile = db.prepare('UPDATE users SET name = @name, email = @email WHERE id = @id');

/**
 * Aggiorna il profilo di un utente (solo nome ed email).
 */
export function updateProfile(id, name, email) {
  return stmtUpdateProfile.run({ id, name, email });
}

const stmtUpdatePassword = db.prepare('UPDATE users SET password_hash = @passwordHash WHERE id = @id');

/**
 * Aggiorna la password di un utente.
 */
export function updatePassword(id, passwordHash) {
  return stmtUpdatePassword.run({ id, passwordHash });
}
