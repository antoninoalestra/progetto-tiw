import Database from '../models/Database.js';
import { calculateNetBalances, optimizeSettlements } from '../utils/balanceCalculator.js';

/**
 * Controller per ottenere i rimborsi calcolati (settlements) di un gruppo.
 * @param {Object} req L'oggetto richiesta Express.
 * @param {Object} res L'oggetto risposta Express.
 */
export const getGroupSettlements = async (req, res) => {
    try {
        const { groupId } = req.params;

        // 1. Recupera tutte le spese dal database
        const allExpenses = await Database.getAll('expenses');

        // 2. Filtra le spese per il gruppo richiesto
        const groupExpenses = allExpenses.filter(expense => expense.groupId === groupId);

        if (groupExpenses.length === 0) {
            // Se non ci sono spese, non ci sono rimborsi da fare
            return res.status(200).json([]);
        }

        // 3. Calcola i saldi netti
        const netBalances = calculateNetBalances(groupExpenses);

        // 4. Ottimizza i rimborsi tramite l'algoritmo greedy
        const settlements = optimizeSettlements(netBalances);

        // 5. Recupera gli utenti per tradurre ID in nomi
        const allUsers = await Database.getAll('users');
        const usersMap = {};
        for (const user of allUsers) {
            usersMap[user.id] = user.name || user.username || user.email || user.id; // Fallback in caso di mancanza del nome
        }

        // 6. Arricchisce i risultati coi nomi veri degli utenti
        const finalSettlements = settlements.map(settlement => ({
            debtorName: usersMap[settlement.debtorId] || settlement.debtorId,
            creditorName: usersMap[settlement.creditorId] || settlement.creditorId,
            amount: settlement.amount
        }));

        // 7. Risposta al client
        res.status(200).json(finalSettlements);

    } catch (error) {
        console.error('Errore durante il calcolo dei rimborsi del gruppo:', error);
        res.status(500).json({ error: 'Errore interno del server durante il calcolo dei rimborsi.' });
    }
};
