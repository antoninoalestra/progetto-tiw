// Controller per la gestione dell'autenticazione e del ciclo di vita della sessione.
// Fornisce gli endpoint per login, registrazione, terminazione della sessione (logout)
// e aggiornamento del profilo utente. Implementa hashing crittografico tramite bcrypt.

import { Router } from 'express';
import bcrypt from 'bcrypt';
import * as usersRepo from '../repositories/users.repo.js';

const router = Router();
const SALT_ROUNDS = 10;

// Mostra la pagina di login (o rimanda alla dashboard se già autenticato)
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/groups');
  }
  res.render('auth/login', { title: 'Accedi a Qotly' });
});

// Controlla le credenziali inviate dal form di login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Controlli base sui campi
  if (!email || !password) {
    req.session.flash = { type: 'error', message: 'Email e password sono obbligatori.' };
    return res.redirect('/login');
  }

  // Verifica l'esistenza dell'utente
  const user = usersRepo.findByEmail(email);
  if (!user) {
    req.session.flash = { type: 'error', message: 'Credenziali non valide.' };
    return res.redirect('/login');
  }

  // Validazione crittografica della password confrontando il plaintext in ingresso
  // con l'hash persistito nel database.
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    req.session.flash = { type: 'error', message: 'Credenziali non valide.' };
    return res.redirect('/login');
  }

  // Autenticazione completata con successo. Avvia la tracciatura della sessione
  // assegnando l'identificatore univoco dell'utente (userId).
  req.session.userId = user.id;
  req.session.flash = { type: 'success', message: `Bentornato, ${user.name}!` };
  return res.redirect('/groups');
});

// Mostra la pagina di registrazione
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/groups');
  }
  res.render('auth/register', { title: 'Registrati a Qotly' });
});

// Gestisce i dati inviati dal form di registrazione
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Controlla i campi
  if (!name || !email || !password) {
    req.session.flash = { type: 'error', message: 'Tutti i campi sono obbligatori.' };
    return res.redirect('/register');
  }

  // La password deve essere sicura
  if (password.length < 6) {
    req.session.flash = { type: 'error', message: 'La password deve avere almeno 6 caratteri.' };
    return res.redirect('/register');
  }

  // Controlla se c'è già un utente con questa email
  const existing = usersRepo.findByEmail(email);
  if (existing) {
    req.session.flash = { type: 'error', message: 'Questa email è già registrata.' };
    return res.redirect('/register');
  }

  // Creazione e persistenza del nuovo utente. La password viene elaborata tramite
  // funzione di hashing irreversibile prima del salvataggio su database.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = usersRepo.create(name, email, passwordHash);

  // Inizializzazione implicita della sessione al completamento della registrazione
  // per migliorare la user experience evitando un login esplicito.
  req.session.userId = Number(result.lastInsertRowid);
  req.session.flash = { type: 'success', message: 'Registrazione completata! Benvenuto su Qotly.' };
  return res.redirect('/groups');
});

// Endpoint per la distruzione della sessione (Logout).
// Invalida l'identificatore utente lato server e reindirizza alla view di login.
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

import { requireAuth } from '../middleware/auth.js';

// Aggiornamento dei dati del profilo utente
router.post('/profile', requireAuth, async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email) {
    req.session.flash = { type: 'error', message: 'I campi Nome ed Email sono obbligatori.' };
    return res.redirect('/groups#tab-profile');
  }

  // Assicuriamoci che l'email scelta non sia già usata da qualcun altro
  const existing = usersRepo.findByEmail(email);
  if (existing && existing.id !== req.session.userId) {
    req.session.flash = { type: 'error', message: 'Questa email è già in uso da un altro account.' };
    return res.redirect('/groups#tab-profile');
  }

  usersRepo.updateProfile(req.session.userId, name, email);

  // Aggiorna la password solo se l'utente ne ha scritta una nuova
  if (password) {
    if (password.length < 6) {
      req.session.flash = { type: 'warning', message: 'Profilo aggiornato. Tuttavia, la nuova password deve avere almeno 6 caratteri e NON è stata salvata.' };
      return res.redirect('/groups#tab-profile');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    usersRepo.updatePassword(req.session.userId, passwordHash);
  }

  req.session.flash = { type: 'success', message: 'Profilo aggiornato con successo!' };
  res.redirect('/groups');
});

export default router;
