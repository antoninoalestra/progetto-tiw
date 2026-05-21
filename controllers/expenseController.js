import Database from '../models/Database.js';

/**
 * Aggiunge una nuova spesa al database, calcolando la divisione in parti uguali.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const addExpense = async (req, res) => {
  try {
    const { groupId, description, amount, payerId, requesterId, participantsId, category, customSplits } = req.body;

    // Validazione dei campi in ingresso
    if (!groupId || !description || amount === undefined || amount === null || !payerId || !requesterId) {
      return res.status(400).json({ error: 'Tutti i campi (incluso requesterId) sono obbligatori.' });
    }
    
    // Categoria predefinita se non specificata
    const expenseCategory = category || 'Generale';

    if (requesterId !== payerId) {
      return res.status(403).json({ error: 'Operazione negata. Puoi registrare solo spese da te effettuate.' });
    }

    if (description.trim().length < 2) {
      return res.status(400).json({ error: 'La descrizione della spesa deve avere almeno 2 caratteri.' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'L\'importo della spesa deve essere un numero maggiore di zero.' });
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

    let splits = [];

    if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
      // Validazione server-side delle quote manuali
      const totalCustom = customSplits.reduce((sum, split) => sum + split.amountOwed, 0);
      if (Math.abs(totalCustom - amount) > 0.05) {
        return res.status(400).json({ error: 'La somma delle quote personalizzate non corrisponde al totale della spesa.' });
      }
      splits = customSplits;
    } else {
      // Divisione equa
      let activeParticipants = members;
      if (participantsId && Array.isArray(participantsId) && participantsId.length > 0) {
        activeParticipants = participantsId;
      }

      if (activeParticipants.length === 0) {
        return res.status(400).json({ error: 'Nessun partecipante valido per questa spesa.' });
      }

      const splitAmount = parseFloat((amount / activeParticipants.length).toFixed(2));

      splits = activeParticipants.map(memberId => ({
        userId: memberId,
        amountOwed: splitAmount
      }));
    }

    // Costruisci l'oggetto spesa
    const newExpense = {
      groupId,
      description,
      amount,
      payerId,
      category: expenseCategory,
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
