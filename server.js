import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

import userRoutes from './routes/users.js';
import groupRoutes from './routes/groups.js';
import expenseRoutes from './routes/expenses.js';
import settlementRoutes from './routes/settlements.js';

// Setup per ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione HTTP Server e Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Gestione Socket.io
io.on('connection', (socket) => {
  console.log(`[Socket] Utente connesso: ${socket.id}`);
  
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`[Socket] Utente ${socket.id} entrato nel gruppo ${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Utente disconnesso: ${socket.id}`);
  });
});

// Middleware per passare 'io' a tutte le rotte
app.use((req, res, next) => {
  req.io = io;
  next();
});

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
httpServer.listen(PORT, () => {
  console.log(`Server HTTP/WebSocket in ascolto sulla porta ${PORT}`);
});
