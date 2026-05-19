/**
 * Calcola i saldi netti di ogni utente a partire da un array di spese.
 * @param {Array} expenses - L'array di spese.
 * @returns {Object} Un oggetto (mappa) dove le chiavi sono gli ID utente e i valori sono i saldi netti (positivi per i creditori, negativi per i debitori).
 */
export function calculateNetBalances(expenses) {
    const balances = {};

    for (const expense of expenses) {
        // Il pagatore riceve un credito pari al totale pagato
        if (!balances[expense.payerId]) {
            balances[expense.payerId] = 0;
        }
        balances[expense.payerId] += parseFloat(expense.amount);

        // Ogni utente nelle quote riceve un debito pari alla propria quota
        for (const split of expense.splits) {
            if (!balances[split.userId]) {
                balances[split.userId] = 0;
            }
            balances[split.userId] -= parseFloat(split.amountOwed);
        }
    }

    // Arrotonda tutti i saldi a 2 decimali
    for (const userId in balances) {
        balances[userId] = Math.round(balances[userId] * 100) / 100;

        // Rimuove eventuali zeri fluttuanti per pulizia (es -0)
        if (balances[userId] === 0 || balances[userId] === -0) {
            balances[userId] = 0;
        }
    }

    return balances;
}

/**
 * Ottimizza i rimborsi calcolando il numero minimo di transazioni necessarie per pareggiare i conti
 * utilizzando un algoritmo di matching greedy (accoppia il maggior creditore con il maggior debitore).
 * @param {Object} balances - Un oggetto con i saldi netti calcolati (es. output di calculateNetBalances).
 * @returns {Array} Un array di oggetti rappresentanti i rimborsi suggeriti: { debtorId, creditorId, amount }.
 */
export function optimizeSettlements(balances) {
    const debtors = [];
    const creditors = [];

    // Separa i debitori dai creditori
    for (const [userId, balance] of Object.entries(balances)) {
        if (balance < 0) {
            debtors.push({ userId, amount: -balance }); // amount diventa positivo per facilitare il calcolo
        } else if (balance > 0) {
            creditors.push({ userId, amount: balance });
        }
    }

    const settlements = [];

    // Algoritmo Greedy: continua a saldare finché ci sono debitori e creditori
    while (debtors.length > 0 && creditors.length > 0) {
        // Ordina per accoppiare il maggior debitore con il maggior creditore
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const largestDebtor = debtors[0];
        const largestCreditor = creditors[0];

        // L'importo da saldare è il minimo tra il debito massimo e il credito massimo
        const settlementAmount = Math.min(largestDebtor.amount, largestCreditor.amount);

        // Arrotonda a 2 decimali
        const roundedAmount = Math.round(settlementAmount * 100) / 100;

        if (roundedAmount > 0) {
            settlements.push({
                debtorId: largestDebtor.userId,
                creditorId: largestCreditor.userId,
                amount: roundedAmount
            });
        }

        // Aggiorna gli importi rimanenti
        largestDebtor.amount -= settlementAmount;
        largestCreditor.amount -= settlementAmount;

        // Arrotonda per evitare errori di precisione nei float
        largestDebtor.amount = Math.round(largestDebtor.amount * 100) / 100;
        largestCreditor.amount = Math.round(largestCreditor.amount * 100) / 100;

        // Rimuovi se il debito o credito è stato completamente saldato (zero o molto vicino allo zero)
        if (largestDebtor.amount <= 0) {
            debtors.shift();
        }
        if (largestCreditor.amount <= 0) {
            creditors.shift();
        }
    }

    return settlements;
}
