// dashboard.js - Gestisce la logica della dashboard dei gruppi

document.addEventListener('DOMContentLoaded', () => {
  // 1. Controllo utente loggato
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/html/login.html';
    return;
  }

  const user = JSON.parse(userStr);
  const userId = user.id;

  const logoutBtn = document.getElementById('logoutBtn');
  const createGroupForm = document.getElementById('createGroupForm');
  const groupsList = document.getElementById('groups-list');

  /**
   * Carica i gruppi dell'utente dal backend e genera le card HTML
   */
  const loadGroups = async () => {
    try {
      const response = await fetch(`/api/groups/user/${userId}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei gruppi');
      }

      const groups = await response.json();
      groupsList.innerHTML = ''; // Pulisce la lista corrente

      if (groups.length === 0) {
        groupsList.innerHTML = '<p>Non fai parte di nessun gruppo. Creane uno per iniziare!</p>';
        return;
      }

      // Genera una card per ogni gruppo
      groups.forEach((group) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';

        // Intestazione della card con il nome del gruppo
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = group.name;
        groupCard.appendChild(groupTitle);

        // Form per aggiungere un membro al gruppo
        const addMemberForm = document.createElement('form');
        addMemberForm.className = 'add-member-form';
        addMemberForm.innerHTML = `
          <input type="email" placeholder="Email del nuovo membro" required>
          <button type="submit">Aggiungi</button>
        `;

        addMemberForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const emailInput = addMemberForm.querySelector('input[type="email"]');
          const email = emailInput.value;

          try {
            const addRes = await fetch(`/api/groups/${group.id}/members`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ email })
            });

            const addData = await addRes.json();

            if (addRes.ok) {
              alert('Membro aggiunto con successo!');
              emailInput.value = ''; // Pulisce l'input
            } else {
              alert(addData.error || 'Errore durante l\'aggiunta del membro.');
            }
          } catch (error) {
            alert('Errore di rete o del server.');
          }
        });

        groupCard.appendChild(addMemberForm);
        groupsList.appendChild(groupCard);
      });
    } catch (error) {
      console.error(error);
      groupsList.innerHTML = '<p>Si è verificato un errore durante il caricamento dei gruppi.</p>';
    }
  };

  // 2. Creazione di un nuovo gruppo
  if (createGroupForm) {
    createGroupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const groupNameInput = document.getElementById('groupName');
      const groupName = groupNameInput.value;

      try {
        const response = await fetch('/api/groups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: groupName, creatorId: userId })
        });

        const data = await response.json();

        if (response.ok) {
          alert('Gruppo creato con successo!');
          groupNameInput.value = ''; // Pulisce il form
          loadGroups(); // Ricarica la lista per mostrare il nuovo gruppo
        } else {
          alert(data.error || 'Errore durante la creazione del gruppo.');
        }
      } catch (error) {
        alert('Errore di rete o del server.');
      }
    });
  }

  // 3. Logica del bottone di Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/html/login.html';
    });
  }

  // 4. Carica i gruppi all'avvio della dashboard
  loadGroups();
});
