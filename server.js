// Configurazione principale dell'app Qotly

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

// Motore di template Handlebars e helpers
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: 'views/layouts',
  partialsDir: 'views/partials',
  helpers: {
    eq: (a, b) => a === b,
    neq: (a, b) => a !== b,
    gt: (a, b) => a > b,
    subtract: (a, b) => a - b,
    formatDate: (d) => new Date(d).toLocaleDateString('it-IT'),
    formatEuro: (n) => `€${Number(n).toFixed(2)}`,
    initial: (str) => str ? str.charAt(0).toUpperCase() : '?',
    balanceClass: (saldo) => saldo >= 0 ? 'credit' : 'debt',
    formatSaldo: (n) => `${n >= 0 ? '+' : ''}€${Math.abs(Number(n)).toFixed(2)}`,
    json: (obj) => JSON.stringify(obj),
    or: (a, b) => a || b,
    and: (a, b) => a && b
  }
}));
app.set('view engine', 'hbs');
app.set('views', 'views');

// Vari middleware base
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'qotly-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 86400000 }
}));

app.use(flashMiddleware);

// Rende i dati dell'utente sempre disponibili nei template
app.use((req, res, next) => {
  if (req.session.userId) {
    res.locals.currentUser = findById(req.session.userId);
  }
  next();
});

// Setup dei router
app.use('/', authRoutes);
app.use('/groups', groupsRoutes);
app.use('/expenses', expensesRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/groups');
  res.redirect('/login');
});

// Fallback 404
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).render('errors/404', { title: 'Pagina non trovata' });
  res.status(404).json({ error: 'Not found' });
});

// Gestione errori globali (Express richiede 4 argomenti per il middleware degli errori)
app.use((err, req, res, next) => {
  console.error(err);
  const detail = process.env.NODE_ENV !== 'production' ? err.message : null;
  if (req.accepts('html')) return res.status(500).render('errors/500', { title: 'Errore del server', detail });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
