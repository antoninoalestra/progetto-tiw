// Repository per la gestione degli utenti
// Le query sono precompilate per ottimizzare le prestazioni

import db from '../db/connection.js';

// Query precompilate
const stmtFindByEmail = db.prepare('SELECT * FROM users WHERE email = @email');
const stmtFindById = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = @id');
const stmtCreate = db.prepare(
  'INSERT INTO users (name, email, password_hash) VALUES (@name, @email, @passwordHash)'
);

// Cerca un utente tramite email (include la password per il login)
export function findByEmail(email) {
  return stmtFindByEmail.get({ email });
}

// Cerca un utente tramite ID (esclude la password)
export function findById(id) {
  return stmtFindById.get({ id });
}

// Inserisce un nuovo utente nel database
export function create(name, email, passwordHash) {
  return stmtCreate.run({ name, email, passwordHash });
}

const stmtUpdateProfile = db.prepare('UPDATE users SET name = @name, email = @email WHERE id = @id');

// Aggiorna nome ed email dell'utente
export function updateProfile(id, name, email) {
  return stmtUpdateProfile.run({ id, name, email });
}

const stmtUpdatePassword = db.prepare('UPDATE users SET password_hash = @passwordHash WHERE id = @id');

// Cambia la password dell'utente
export function updatePassword(id, passwordHash) {
  return stmtUpdatePassword.run({ id, passwordHash });
}
