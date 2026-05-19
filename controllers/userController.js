import Database from '../models/Database.js';
import crypto from 'crypto';

/**
 * Registra un nuovo utente.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const registerUser = async (req, res) => {
  try {
    const { nome, email, password } = req.body;

    if (!nome || !email || !password) {
      return res.status(400).json({ error: 'Tutti i campi (nome, email, password) sono obbligatori.' });
    }

    const users = await Database.getAll('users');

    // Controlla se l'email esiste già
    const userExists = users.find(user => user.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'Email già in uso.' });
    }

    // Crea un nuovo utente. L'ID univoco viene generato da Database.insert.
    const newUser = {
      nome,
      email,
      password // Salvataggio della password in chiaro come richiesto per semplicità
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

    // Crea l'oggetto utente omettendo la password
    const userWithoutPassword = {
      id: user.id,
      nome: user.nome,
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
