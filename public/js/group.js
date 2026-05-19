document.addEventListener('DOMContentLoaded', () => {
    // ID fittizio del gruppo per dimostrazione (dovrebbe essere preso dall'URL o sessione)
    const currentGroupId = 'grp-456';
    const form = document.getElementById('add-expense-form');

    // Carica i rimborsi all'avvio della pagina
    loadSettlements(currentGroupId);

    // Gestione mockata dell'aggiunta spesa
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // In una vera app, qui faresti una POST al server per salvare la spesa
        console.log("Mock: Spesa inserita");

        // Subito dopo aver inserito la spesa, si ricalcolano e si mostrano i nuovi saldi
        loadSettlements(currentGroupId);
        form.reset();
        alert("Spesa simulata inserita! I rimborsi sono stati aggiornati.");
    });
});

/**
 * Funzione che effettua una fetch al server per ottenere i rimborsi ottimizzati
 * e aggiorna il DOM.
 * @param {string} groupId - L'ID del gruppo
 */
async function loadSettlements(groupId) {
    const listElement = document.getElementById('settlements-list');
    listElement.innerHTML = '<li class="empty-message">Caricamento in corso...</li>';

    try {
        const response = await fetch(`/api/groups/${groupId}/settlements`);

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const settlements = await response.json();

        // Pulisci la lista
        listElement.innerHTML = '';

        if (settlements.length === 0) {
            listElement.innerHTML = '<li class="empty-message">Tutti i conti sono in pareggio! Nessun rimborso necessario.</li>';
            return;
        }

        // Itera sull'array e crea gli elementi DOM
        for (const settlement of settlements) {
            const li = document.createElement('li');
            // Formatta l'importo per mostrare sempre 2 decimali
            const amountFormatted = parseFloat(settlement.amount).toFixed(2);

            // Crea la stringa es: "Marco deve 15.50€ a Giulia"
            li.textContent = `${settlement.debtorName} deve ${amountFormatted}€ a ${settlement.creditorName}`;
            listElement.appendChild(li);
        }

    } catch (error) {
        console.error("Errore durante il caricamento dei rimborsi:", error);
        listElement.innerHTML = '<li class="empty-message" style="color: red;">Impossibile caricare i rimborsi al momento.</li>';
    }
}
