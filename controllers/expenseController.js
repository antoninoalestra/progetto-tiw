import Database from '../models/Database.js';

/**
 * Aggiunge una nuova spesa al database, calcolando la divisione in parti uguali.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const addExpense = async (req, res) => {
  try {
    const { groupId, description, amount, payerId } = req.body;

    // Validazione dei campi in ingresso
    if (!groupId || !description || typeof amount !== 'number' || !payerId) {
      return res.status(400).json({ error: 'Tutti i campi (groupId, description, amount, payerId) sono obbligatori e amount deve essere un numero.' });
    }

    // Recupera il gruppo corrispondente
    const group = await Database.getById('groups', groupId);

    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato.' });
    }

    const { members } = group;

    // Se non ci sono membri, non possiamo dividere la spesa
    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'Il gruppo non ha membri.' });
    }

    // Calcola la divisione in parti uguali, arrotondata a 2 decimali
    const splitAmount = parseFloat((amount / members.length).toFixed(2));

    // Genera l'array di divisione (splits)
    const splits = members.map(memberId => ({
      userId: memberId,
      amountOwed: splitAmount
    }));

    // Costruisci l'oggetto spesa
    const newExpense = {
      groupId,
      description,
      amount,
      payerId,
      date: new Date().toISOString(),
      splits
    };

    // Salva nel database (l'ID viene generato automaticamente dal DAL)
    const savedExpense = await Database.insert('expenses', newExpense);

    res.status(201).json({ message: 'Spesa aggiunta con successo.', expense: savedExpense });
  } catch (error) {
    console.error('Errore durante l\'aggiunta della spesa:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Recupera tutte le spese associate a un determinato gruppo.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Recupera tutte le spese
    const allExpenses = await Database.getAll('expenses');

    // Filtra quelle relative al gruppo richiesto
    const groupExpenses = allExpenses.filter(expense => expense.groupId === groupId);

    res.status(200).json(groupExpenses);
  } catch (error) {
    console.error('Errore durante il recupero delle spese:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};
