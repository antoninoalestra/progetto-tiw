import Database from '../models/Database.js';

/**
 * Registra un nuovo rimborso (settlement) nel database.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const addSettlement = async (req, res) => {
  try {
    const { groupId, payerId, payeeId, amount, requesterId } = req.body;

    // Validazione dei dati di base
    if (!groupId || !payerId || !payeeId || amount === undefined || amount === null || !requesterId) {
      return res.status(400).json({ error: 'I campi groupId, payerId, payeeId, amount e requesterId sono obbligatori.' });
    }

    if (requesterId !== payerId) {
      return res.status(403).json({ error: 'Operazione negata. Puoi saldare solo i tuoi debiti.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'L\'importo del rimborso deve essere un numero maggiore di zero.' });
    }

    // Creazione del rimborso da inserire nel DB
    const settlementData = {
      groupId,
      payerId,
      payeeId,
      amount: numericAmount,
      date: new Date().toISOString()
    };

    // Salva nella collezione "settlements"
    const newSettlement = await Database.insert('settlements', settlementData);

    res.status(201).json(newSettlement);
  } catch (error) {
    console.error('Errore durante la registrazione del rimborso:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};
