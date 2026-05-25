// server.js
// Punto di ingresso dell'applicazione Qotly.
// Express 5 + Handlebars + SQLite + Session

import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import { flashMiddleware } from './src/middleware/flash.js';
import { findById } from './src/repositories/users.repo.js';
import authRoutes from './src/routes/auth.routes.js';
import groupsRoutes from './src/routes/groups.routes.js';
import expensesRoutes from './src/routes/expenses.routes.js';
import apiRoutes from './src/routes/api.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Template engine — Handlebars con helpers personalizzati
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: 'views/layouts',
  partialsDir: 'views/partials',
  helpers: {
    // Confronto di uguaglianza
    eq: (a, b) => a === b,
    // Confronto di disuguaglianza
    neq: (a, b) => a !== b,
    // Maggiore di
    gt: (a, b) => a > b,
    // Sottrazione
    subtract: (a, b) => a - b,
    // Formatta data in italiano
    formatDate: (d) => new Date(d).toLocaleDateString('it-IT'),
    // Formatta numero in euro
    formatEuro: (n) => `€${Number(n).toFixed(2)}`,
    // Prima lettera maiuscola (per avatar)
    initial: (str) => str ? str.charAt(0).toUpperCase() : '?',
    // Classe CSS per saldo
    balanceClass: (saldo) => saldo >= 0 ? 'credit' : 'debt',
    // Saldo formattato con segno
    formatSaldo: (n) => `${n >= 0 ? '+' : ''}€${Math.abs(Number(n)).toFixed(2)}`,
    // Serializza oggetto in JSON (per script tag)
    json: (obj) => JSON.stringify(obj),
    // Operatore OR
    or: (a, b) => a || b,
    // Operatore AND
    and: (a, b) => a && b
  }
}));
app.set('view engine', 'hbs');
app.set('views', 'views');

// 2. Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 3. File statici
app.use(express.static('public'));

// 4. Sessioni
app.use(session({
  secret: process.env.SESSION_SECRET || 'qotly-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 86400000 }
}));

// 5. Flash messages
app.use(flashMiddleware);

// 6. Utente corrente in res.locals per tutte le viste
app.use((req, res, next) => {
  if (req.session.userId) {
    res.locals.currentUser = findById(req.session.userId);
  }
  next();
});

// 7. Routes
app.use('/', authRoutes);
app.use('/groups', groupsRoutes);
app.use('/expenses', expensesRoutes);
app.use('/api', apiRoutes);

// Route principale
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/groups');
  res.redirect('/login');
});

// 8. 404 handler
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).render('errors/404', { title: 'Pagina non trovata' });
  res.status(404).json({ error: 'Not found' });
});

// 9. Error handler (firma a 4 argomenti obbligatoria per Express)
app.use((err, req, res, next) => {
  console.error(err);
  const detail = process.env.NODE_ENV !== 'production' ? err.message : null;
  if (req.accepts('html')) return res.status(500).render('errors/500', { title: 'Errore del server', detail });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
