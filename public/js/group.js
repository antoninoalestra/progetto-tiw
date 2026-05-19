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
    } catch (error) {
      console.error(error);
      expenseMessage.textContent = error.message;
    }
  });

  // Inizializza la pagina
  async function init() {
    await loadGroupDetails();
    await loadExpenses();
  }

  init();
});
