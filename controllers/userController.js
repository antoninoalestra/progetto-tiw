import Database from '../models/Database.js';
import crypto from 'crypto';
import { calculateNetBalances, optimizeSettlements } from '../utils/balanceCalculator.js';

/**
 * Registra un nuovo utente.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const registerUser = async (req, res) => {
  try {
    const { nome, cognome, email, password } = req.body;

    if (!nome || !cognome || !email || !password) {
      return res.status(400).json({ error: 'Tutti i campi (nome, cognome, email, password) sono obbligatori.' });
    }

    if (nome.trim().length < 2 || cognome.trim().length < 2) {
      return res.status(400).json({ error: 'Nome e cognome devono avere almeno 2 caratteri.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Inserisci un indirizzo email valido.' });
    }

    if (password.trim().length < 8) {
      return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri.' });
    }

    const users = await Database.getAll('users');

    // Controlla se l'email esiste già
    const userExists = users.find(user => user.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'Email già in uso.' });
    }

    const newUser = {
      nome,
      cognome,
      email,
      password 
    };

    await Database.insert('users', newUser);

    res.status(201).json({ message: 'Utente registrato con successo.' });
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Effettua il login di un utente.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    }

    const users = await Database.getAll('users');

    // Trova l'utente per email
    const user = users.find(u => u.email === email);

    // Verifica le credenziali
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenziali non valide.' });
    }

    const userWithoutPassword = {
      id: user.id,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email
    };

    // Genera un finto token casuale
    const mockToken = crypto.randomBytes(16).toString('hex');

    res.status(200).json({
      user: userWithoutPassword,
      token: mockToken
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Aggiorna i dati del profilo utente.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cognome, email, password } = req.body;

    const updates = {};
    if (nome) {
      if (nome.trim().length < 2) return res.status(400).json({ error: 'Il nome deve avere almeno 2 caratteri.' });
      updates.nome = nome;
    }
    if (cognome) {
      if (cognome.trim().length < 2) return res.status(400).json({ error: 'Il cognome deve avere almeno 2 caratteri.' });
      updates.cognome = cognome;
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ error: 'Inserisci un indirizzo email valido.' });
      updates.email = email;
    }
    if (password) {
      if (password.trim().length < 8) return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri.' });
      updates.password = password;
    }

    const updatedUser = await Database.update('users', id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }

    const userWithoutPassword = {
      id: updatedUser.id,
      nome: updatedUser.nome,
      cognome: updatedUser.cognome,
      email: updatedUser.email
    };

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dell\'utente:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Calcola i bilanci globali (debiti e crediti) di un utente su tutti i gruppi.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getUserBalances = async (req, res) => {
  try {
    const { userId } = req.params;

    const allGroups = await Database.getAll('groups');
    const userGroups = allGroups.filter(g => g.members && g.members.includes(userId));

    const allExpenses = await Database.getAll('expenses');
    const allSettlements = await Database.getAll('settlements');

    let totalOwed = 0; // Totale debiti
    let totalCredit = 0; // Totale crediti
    let details = []; // Dettaglio per gruppo

    userGroups.forEach(group => {
      const groupExpenses = allExpenses.filter(e => e.groupId === group.id);
      const groupSettlements = allSettlements.filter(s => s.groupId === group.id);

      const netBalances = calculateNetBalances(groupExpenses, groupSettlements);
      const suggested = optimizeSettlements(netBalances);

      let groupOwed = 0;
      let groupCredit = 0;

      suggested.forEach(s => {
        if (s.debtorId === userId) {
          groupOwed += s.amount;
          totalOwed += s.amount;
        }
        if (s.creditorId === userId) {
          groupCredit += s.amount;
          totalCredit += s.amount;
        }
      });

      if (groupOwed > 0 || groupCredit > 0) {
         details.push({
           groupId: group.id,
           groupName: group.name,
           owed: groupOwed,
           credit: groupCredit
         });
      }
    });

    res.status(200).json({ totalOwed, totalCredit, details });
  } catch (error) {
    console.error('Errore durante il calcolo dei bilanci globali:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

