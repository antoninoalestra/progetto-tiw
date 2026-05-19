document.addEventListener('DOMContentLoaded', () => {
  // 1. Estrai il groupId dalla query string dell'URL (es: group.html?id=123)
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');

  // Elementi DOM
  const groupTitle = document.getElementById('group-title');
  const payerSelect = document.getElementById('payer');
  const expensesList = document.getElementById('expenses-list');
  const addExpenseForm = document.getElementById('add-expense-form');
  const expenseMessage = document.getElementById('expense-message');
  const backToDashboard = document.getElementById('backToDashboard');
  const suggestedSettlementsList = document.getElementById('suggested-settlements-list');
  const pastSettlementsList = document.getElementById('past-settlements-list');

  // Gestione pulsante indietro (mockato a index.html o dashboard.html a seconda del progetto)
  backToDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'dashboard.html'; // Supponendo che la dashboard si chiami dashboard.html
  });

  if (!groupId) {
    groupTitle.textContent = 'Errore: ID Gruppo mancante.';
    expensesList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <p>Impossibile caricare le spese. ID Gruppo mancante.</p>
      </div>`;
    return;
  }

  // Mappa globale per salvare i nomi degli utenti (per mostrare chi ha pagato nello storico)
  const usersMap = {};

  /**
   * Carica i dettagli del gruppo e popola la select dei membri.
   */
  async function loadGroupDetails() {
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      if (!response.ok) {
        throw new Error('Errore nel recupero del gruppo.');
      }
      const group = await response.json();

      // Imposta il titolo con il nome del gruppo
      groupTitle.textContent = group.name || 'Dettaglio Gruppo';

      // Svuota la select (mantieni solo la prima option vuota)
      payerSelect.innerHTML = '<option value="">-- Seleziona un membro --</option>';

      // Popola la select e la mappa degli utenti
      if (group.members && group.members.length > 0) {
        group.members.forEach(member => {
          // Salva nella mappa
          usersMap[member.id] = member.nome;

          // Crea option per la select
          const option = document.createElement('option');
          option.value = member.id;
          option.textContent = member.nome;
          payerSelect.appendChild(option);
        });
      } else {
        payerSelect.innerHTML = '<option value="">-- Nessun membro nel gruppo --</option>';
      }
    } catch (error) {
      console.error(error);
      groupTitle.textContent = 'Errore durante il caricamento del gruppo.';
      showNotification('Errore durante il caricamento dei dettagli del gruppo.', true);
    }
  }

  /**
   * Carica e mostra lo storico delle spese del gruppo.
   */
  async function loadExpenses() {
    try {
      const response = await fetch(`/api/expenses/group/${groupId}`);
      if (!response.ok) {
        throw new Error('Errore nel recupero delle spese.');
      }
      const expenses = await response.json();

      expensesList.innerHTML = '';

      if (expenses.length === 0) {
        expensesList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>
            <p>Nessuna spesa registrata. Aggiungi la prima spesa per iniziare a dividere i conti!</p>
          </div>`;
        return;
      }

      // Cicla ogni spesa e crea l'HTML
      expenses.forEach(expense => {
        const expenseDiv = document.createElement('div');
        expenseDiv.className = 'expense-item';

        // Recupera il nome del pagatore dalla mappa
        const payerName = usersMap[expense.payerId] || 'Utente Sconosciuto';
        const dateStr = new Date(expense.date).toLocaleDateString('it-IT');

        expenseDiv.innerHTML = `
          <strong>${expense.description}</strong> - &euro;${parseFloat(expense.amount).toFixed(2)}<br>
          <small>Pagato da: ${payerName} in data ${dateStr}</small>
        `;
        expensesList.appendChild(expenseDiv);
      });
    } catch (error) {
      console.error(error);
      expensesList.innerHTML = '<p>Errore nel caricamento delle spese.</p>';
      showNotification('Errore nel caricamento dello storico spese.', true);
    }
  }

  /**
   * Gestisce il submit del form per aggiungere una nuova spesa.
   */
  addExpenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const payerId = document.getElementById('payer').value;

    if (!description || isNaN(amount) || amount <= 0 || !payerId) {
      showNotification('Compila tutti i campi. L\'importo deve essere > 0.', true);
      return;
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupId,
          description,
          amount,
          payerId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante l\'aggiunta della spesa.');
      }

      showNotification('Spesa aggiunta con successo!', false);

      // Resetta il form
      addExpenseForm.reset();

      // Ricarica la lista delle spese per visualizzare quella nuova
      await loadExpenses();
      // Ricarica anche i rimborsi poiché una nuova spesa cambia i saldi
      await loadSettlements();
    } catch (error) {
      console.error(error);
      showNotification(error.message, true);
    }
  });

  /**
   * Carica i rimborsi suggeriti e lo storico dei rimborsi dal server.
   */
  async function loadSettlements() {
    try {
      const response = await fetch(`/api/groups/${groupId}/settlements`);
      if (!response.ok) {
        throw new Error('Errore nel recupero dei rimborsi.');
      }
      const data = await response.json();

      const suggested = data.suggestedSettlements || [];
      const past = data.pastSettlements || [];

      suggestedSettlementsList.innerHTML = '';
      if (suggested.length === 0) {
        suggestedSettlementsList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <p>Tutti i conti sono in pari! Nessun rimborso suggerito.</p>
          </div>`;
      } else {
        suggested.forEach(settlement => {
          const debtorName = usersMap[settlement.debtorId] || 'Utente Sconosciuto';
          const creditorName = usersMap[settlement.creditorId] || 'Utente Sconosciuto';

          const itemDiv = document.createElement('div');
          itemDiv.className = 'settlement-item';

          itemDiv.innerHTML = `
            <span><strong>${debtorName}</strong> deve &euro;${parseFloat(settlement.amount).toFixed(2)} a <strong>${creditorName}</strong></span>
            <button class="settle-btn"
              data-debtor-id="${settlement.debtorId}"
              data-creditor-id="${settlement.creditorId}"
              data-amount="${settlement.amount}">Salda</button>
          `;

          suggestedSettlementsList.appendChild(itemDiv);
        });

        // Aggiungi event listener a tutti i bottoni "Salda"
        const settleButtons = document.querySelectorAll('.settle-btn');
        settleButtons.forEach(btn => {
          btn.addEventListener('click', handleSettleClick);
        });
      }

      pastSettlementsList.innerHTML = '';
      if (past.length === 0) {
        pastSettlementsList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            <p>Nessun rimborso effettuato finora.</p>
          </div>`;
      } else {
        past.forEach(settlement => {
          const payerName = usersMap[settlement.payerId] || 'Utente Sconosciuto';
          const payeeName = usersMap[settlement.payeeId] || 'Utente Sconosciuto';
          const dateStr = settlement.date ? new Date(settlement.date).toLocaleDateString('it-IT') : 'Data sconosciuta';

          const itemDiv = document.createElement('div');
          itemDiv.className = 'expense-item';
          itemDiv.innerHTML = `
            <strong>${payerName}</strong> ha pagato &euro;${parseFloat(settlement.amount).toFixed(2)} a <strong>${payeeName}</strong><br>
            <small>Data: ${dateStr}</small>
          `;

          pastSettlementsList.appendChild(itemDiv);
        });
      }

    } catch (error) {
      console.error(error);
      suggestedSettlementsList.innerHTML = '<p>Errore nel caricamento dei rimborsi suggeriti.</p>';
      pastSettlementsList.innerHTML = '<p>Errore nel caricamento dello storico rimborsi.</p>';
      showNotification('Errore durante il caricamento dei rimborsi.', true);
    }
  }

  /**
   * Gestisce il click sul bottone "Salda".
   */
  async function handleSettleClick(e) {
    const btn = e.target;
    const payerId = btn.getAttribute('data-debtor-id');
    const payeeId = btn.getAttribute('data-creditor-id');
    const amount = btn.getAttribute('data-amount');

    try {
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupId,
          payerId,
          payeeId,
          amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la registrazione del rimborso.');
      }

      showNotification('Rimborso registrato con successo!', false);
      await loadSettlements();

    } catch (error) {
      console.error(error);
      showNotification(error.message, true);
    }
  }

  // Inizializza la pagina
  async function init() {
    await loadGroupDetails();
    await loadExpenses();
    await loadSettlements();
  }

  init();
});
