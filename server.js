// Configurazione principale del server e dell'applicazione Qotly.
// Inizializza Express, il motore di rendering, la gestione delle sessioni e il routing globale.
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

// Configurazione del motore di template Handlebars.
// Include la registrazione di helper personalizzati necessari per la formattazione 
// di valute, date e per la logica condizionale direttamente nelle viste.
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

// Inizializzazione dei middleware fondamentali.
// Assolvono ai compiti di parsing dei form (urlencoded/json), distribuzione dei file statici 
// e gestione sicura delle sessioni utente tramite cookie.
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

// Middleware per l'iniezione dei dati utente.
// Se presente una sessione attiva, l'oggetto utente viene recuperato dal database
// e reso disponibile a livello globale per il motore di rendering tramite res.locals.
app.use((req, res, next) => {
  if (req.session.userId) {
    res.locals.currentUser = findById(req.session.userId);
  }
  next();
});

// Definizione e mount dei moduli di routing.
app.use('/', authRoutes);
app.use('/groups', groupsRoutes);
app.use('/expenses', expensesRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/groups');
  res.redirect('/login');
});

// Gestione del fallback per richieste a risorse inesistenti (HTTP 404).
// Restituisce la pagina di errore standard o una risposta JSON a seconda dell'Accept header.
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).render('errors/404', { title: 'Pagina non trovata' });
  res.status(404).json({ error: 'Not found' });
});

// Middleware globale per la gestione delle eccezioni (HTTP 500).
// Intercetta errori imprevisti per prevenire l'arresto del processo Node.js e fornisce 
// un feedback controllato all'utente.
app.use((err, req, res, next) => {
  console.error(err);
  const detail = process.env.NODE_ENV !== 'production' ? err.message : null;
  if (req.accepts('html')) return res.status(500).render('errors/500', { title: 'Errore del server', detail });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
