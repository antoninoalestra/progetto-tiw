// src/routes/auth.routes.js
// Rotte per l'autenticazione: login, registrazione e logout.
// Segue il pattern PRG (Post-Redirect-Get) per ogni operazione POST.

import { Router } from 'express';
import bcrypt from 'bcrypt';
import * as usersRepo from '../repositories/users.repo.js';

const router = Router();
const SALT_ROUNDS = 10;

// GET /login — Mostra il form di login (o redirect se già loggato)
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/groups');
  }
  res.render('auth/login', { title: 'Accedi a Qotly' });
});

// POST /login — Autentica l'utente con email e password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validazione campi obbligatori
  if (!email || !password) {
    req.session.flash = { type: 'error', message: 'Email e password sono obbligatori.' };
    return res.redirect('/login');
  }

  // Cerca l'utente nel database
  const user = usersRepo.findByEmail(email);
  if (!user) {
    req.session.flash = { type: 'error', message: 'Credenziali non valide.' };
    return res.redirect('/login');
  }

  // Verifica la password con bcrypt
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    req.session.flash = { type: 'error', message: 'Credenziali non valide.' };
    return res.redirect('/login');
  }

  // Imposta la sessione e reindirizza alla dashboard
  req.session.userId = user.id;
  req.session.flash = { type: 'success', message: `Bentornato, ${user.name}!` };
  return res.redirect('/groups');
});

// GET /register — Mostra il form di registrazione (o redirect se già loggato)
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/groups');
  }
  res.render('auth/register', { title: 'Registrati a Qotly' });
});

// POST /register — Registra un nuovo utente
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Validazione campi obbligatori
  if (!name || !email || !password) {
    req.session.flash = { type: 'error', message: 'Tutti i campi sono obbligatori.' };
    return res.redirect('/register');
  }

  // Validazione lunghezza password minima
  if (password.length < 6) {
    req.session.flash = { type: 'error', message: 'La password deve avere almeno 6 caratteri.' };
    return res.redirect('/register');
  }

  // Controlla che l'email non sia già registrata
  const existing = usersRepo.findByEmail(email);
  if (existing) {
    req.session.flash = { type: 'error', message: 'Questa email è già registrata.' };
    return res.redirect('/register');
  }

  // Hash della password e creazione utente
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = usersRepo.create(name, email, passwordHash);

  // Imposta la sessione automaticamente dopo la registrazione
  req.session.userId = Number(result.lastInsertRowid);
  req.session.flash = { type: 'success', message: 'Registrazione completata! Benvenuto su Qotly.' };
  return res.redirect('/groups');
});

// POST /logout — Distrugge la sessione e reindirizza al login
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

import { requireAuth } from '../middleware/auth.js';

// POST /profile — Aggiorna il profilo utente
router.post('/profile', requireAuth, async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email) {
    req.session.flash = { type: 'error', message: 'I campi Nome ed Email sono obbligatori.' };
    return res.redirect('/groups#tab-profile');
  }

  // Verifica se l'email esiste già e appartiene ad un altro utente
  const existing = usersRepo.findByEmail(email);
  if (existing && existing.id !== req.session.userId) {
    req.session.flash = { type: 'error', message: 'Questa email è già in uso da un altro account.' };
    return res.redirect('/groups#tab-profile');
  }

  usersRepo.updateProfile(req.session.userId, name, email);

  // Se è stata inserita una nuova password, aggiornala
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
