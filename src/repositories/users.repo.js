// Modulo di repository per la gestione della persistenza dell'entità User.
// Fornisce le API per l'autenticazione, la registrazione e l'aggiornamento dei profili utente.

import db from '../db/connection.js';

// Query precompilate
const stmtFindByEmail = db.prepare('SELECT * FROM users WHERE email = @email');
const stmtFindById = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = @id');
const stmtCreate = db.prepare(
  'INSERT INTO users (name, email, password_hash) VALUES (@name, @email, @passwordHash)'
);

// Recupero del record utente tramite indirizzo email.
// Funzione impiegata in fase di autenticazione; include l'hash crittografico della password per la validazione.
export function findByEmail(email) {
  return stmtFindByEmail.get({ email });
}

// Recupero del record utente omettendo dati sensibili (hash della password).
// Ottimizzato per il caricamento in memoria del profilo utente (es. in res.locals.currentUser) 
// mantenendo un perimetro di sicurezza adeguato.
export function findById(id) {
  return stmtFindById.get({ id });
}

// Inserimento di un nuovo utente nel database.
// Precondizione: l'argomento 'passwordHash' deve essere processato tramite algoritmo di hashing prima dell'invocazione.
export function create(name, email, passwordHash) {
  return stmtCreate.run({ name, email, passwordHash });
}

const stmtUpdateProfile = db.prepare('UPDATE users SET name = @name, email = @email WHERE id = @id');

// Aggiornamento dei dati anagrafici e di contatto dell'utente.
export function updateProfile(id, name, email) {
  return stmtUpdateProfile.run({ id, name, email });
}

const stmtUpdatePassword = db.prepare('UPDATE users SET password_hash = @passwordHash WHERE id = @id');

// Modifica delle credenziali di accesso. 
// Richiede il passaggio dell'hash crittografico aggiornato, non della password in chiaro.
export function updatePassword(id, passwordHash) {
  return stmtUpdatePassword.run({ id, passwordHash });
}
