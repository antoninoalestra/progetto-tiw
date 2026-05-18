import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/users.js';

// Setup per ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per analizzare il corpo delle richieste in JSON
app.use(express.json());

// Servi i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Monta il router degli utenti sotto '/api/users'
app.use('/api/users', userRoutes);

// Route principale che reindirizza al login
app.get('/', (req, res) => {
  res.redirect('/html/login.html');
});

// Avvia il server
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
