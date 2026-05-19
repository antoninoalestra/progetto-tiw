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
    expensesList.innerHTML = '<p>Impossibile caricare le spese.</p>';
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

      expensesList.innerHTML = ''; // Svuota il contenitore

      if (expenses.length === 0) {
        expensesList.innerHTML = '<p>Nessuna spesa registrata per questo gruppo.</p>';
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
    }
  }

  /**
   * Gestisce il submit del form per aggiungere una nuova spesa.
   */
  addExpenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    expenseMessage.textContent = '';
    expenseMessage.style.color = 'red';

    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const payerId = document.getElementById('payer').value;

    if (!description || isNaN(amount) || !payerId) {
      expenseMessage.textContent = 'Compila tutti i campi correttamente.';
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

      expenseMessage.style.color = 'green';
      expenseMessage.textContent = 'Spesa aggiunta con successo!';

      // Resetta il form
      addExpenseForm.reset();

      // Ricarica la lista delle spese per visualizzare quella nuova
      await loadExpenses();
      // Ricarica anche i rimborsi poiché una nuova spesa cambia i saldi
      await loadSettlements();
    } catch (error) {
      console.error(error);
      expenseMessage.textContent = error.message;
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

      // Rendi l'HTML dei rimborsi suggeriti
      suggestedSettlementsList.innerHTML = '';
      if (suggested.length === 0) {
        suggestedSettlementsList.innerHTML = '<p>Tutti i conti sono saldati!</p>';
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

      // Rendi l'HTML dello storico rimborsi
      pastSettlementsList.innerHTML = '';
      if (past.length === 0) {
        pastSettlementsList.innerHTML = '<p>Nessun rimborso effettuato finora.</p>';
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

      // Ricarica la lista dei rimborsi per aggiornare la UI
      await loadSettlements();

    } catch (error) {
      console.error(error);
      alert(error.message);
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
