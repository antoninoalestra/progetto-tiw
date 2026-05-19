import Database from '../models/Database.js';
import { calculateNetBalances, optimizeSettlements } from '../utils/balanceCalculator.js';

/**
 * Recupera un gruppo dal suo ID, popolando le informazioni sui membri.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: 'L\'ID del gruppo è obbligatorio.' });
    }

    // Recupera il gruppo dal database
    const group = await Database.getById('groups', groupId);

    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato.' });
    }

    // Recupera tutti gli utenti per popolare le info dei membri del gruppo
    const allUsers = await Database.getAll('users');

    // Popola l'array members
    const populatedMembers = group.members.map(memberId => {
      const user = allUsers.find(u => u.id === memberId);
      // Se l'utente non viene trovato, restituiamo un utente mockato
      return user ? { id: user.id, nome: user.nome } : { id: memberId, nome: 'Utente Sconosciuto' };
    });

    // Crea un nuovo oggetto gruppo con i membri popolati
    const populatedGroup = {
      ...group,
      members: populatedMembers
    };

    res.status(200).json(populatedGroup);
  } catch (error) {
    console.error('Errore durante il recupero del gruppo:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Calcola e restituisce i rimborsi suggeriti per un gruppo,
 * tenendo conto delle spese e dei rimborsi (settlements) già effettuati.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: 'L\'ID del gruppo è obbligatorio.' });
    }

    // Recupera tutte le spese
    const allExpenses = await Database.getAll('expenses');
    // Filtra le spese del gruppo
    const groupExpenses = allExpenses.filter(e => e.groupId === groupId);

    // Recupera tutti i rimborsi
    const allSettlements = await Database.getAll('settlements');
    // Filtra i rimborsi del gruppo
    const groupSettlements = allSettlements.filter(s => s.groupId === groupId);

    // Calcola i saldi netti tenendo conto sia delle spese sia dei rimborsi
    const netBalances = calculateNetBalances(groupExpenses, groupSettlements);

    // Calcola i rimborsi suggeriti per azzerare i debiti rimanenti
    const suggestedSettlements = optimizeSettlements(netBalances);

    res.status(200).json({
      netBalances,
      suggestedSettlements,
      pastSettlements: groupSettlements
    });
  } catch (error) {
    console.error('Errore durante il calcolo dei rimborsi:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};
