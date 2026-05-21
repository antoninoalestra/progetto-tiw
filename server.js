import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import userRoutes from './routes/users.js';
import groupRoutes from './routes/groups.js';
import expenseRoutes from './routes/expenses.js';
import settlementRoutes from './routes/settlements.js';

// Setup per ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per analizzare il corpo delle richieste in JSON
app.use(express.json());

// Servi i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rotte API
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);

// Route principale che reindirizza al login
app.get('/', (req, res) => {
  res.redirect('/html/login.html');
});

// Avvia il server
app.listen(PORT, () => {
  console.log(`Server HTTP in ascolto sulla porta ${PORT}`);
});
