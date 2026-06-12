// Entry point principale per la logica client-side dell'applicazione.
// Gestisce il ciclo di vita dei componenti UI, chiamate asincrone tramite Fetch API 
// e la manipolazione dinamica del DOM in assenza di framework reattivi.
document.addEventListener('DOMContentLoaded', () => {

  // Gestione del ciclo di vita dei flash messages.
  // Applica una transizione CSS di fade-out e rimuove l'elemento dal DOM dopo un delay di 5 secondi.
  const flashMessage = document.getElementById('flash-message');
  if (flashMessage) {
    setTimeout(() => {
      flashMessage.style.animation = 'flashFadeOut 0.5s ease forwards';
      setTimeout(() => flashMessage.remove(), 500);
    }, 5000);
  }

  // Pattern architetturale per la gestione della navigazione a schede (Tab Navigation).
  // Isola l'attivazione visiva del tab e la conseguente visualizzazione del contenuto target
  // nascondendo i nodi DOM fratelli.
  const setupTabs = (tabSelector, contentSelector) => {
    const tabs = document.querySelectorAll(tabSelector);
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        // Resetta lo stato di tutti i tab
        document.querySelectorAll(tabSelector).forEach(t => t.classList.remove('tab-active', 'active'));
        document.querySelectorAll(contentSelector).forEach(c => c.style.display = 'none');

        // Evidenzia il tab appena cliccato e mostra il contenuto collegato
        tab.classList.add('tab-active');
        if (tab.classList.contains('nav-link') || tab.classList.contains('bnav-link')) {
          tab.classList.add('active');
        }

        const targetId = tab.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.style.display = 'block';
        }
      });
    });
  };

  // Applica la logica ai vari tab presenti nell'interfaccia
  setupTabs('.nav-link[data-target]', '.tab-content');
  setupTabs('.bnav-link[data-target]', '.tab-content');
  setupTabs('.tabs .tab-item[data-target]', '.tab-content');

  // Inizializzazione della componente Modale per la creazione o adesione ai gruppi.
  const groupModal = document.getElementById('new-group-modal');
  if (groupModal) {
    const btnNuovo = document.getElementById('nav-btn-nuovo');
    const btnNuovoMobile = document.getElementById('mobile-nuovo-btn');
    const btnAltNuovo = document.getElementById('alt-nuovo-gruppo-btn');
    const closeGroupModal = document.getElementById('close-new-group-modal');

    const openGroupModal = (e) => {
      e.preventDefault();
      groupModal.classList.add('active');
    };

    if (btnNuovo) btnNuovo.addEventListener('click', openGroupModal);
    if (btnNuovoMobile) btnNuovoMobile.addEventListener('click', openGroupModal);
    if (btnAltNuovo) btnAltNuovo.addEventListener('click', openGroupModal);
    
    if (closeGroupModal) {
      closeGroupModal.addEventListener('click', () => groupModal.classList.remove('active'));
    }

    // Scambia tra "Crea" e "Unisciti" all'interno della finestra
    window.showGroupTab = (tabId) => {
      document.querySelectorAll('#new-group-modal .tab-item').forEach(t => t.classList.remove('tab-active'));
      document.getElementById('group-tab-create').style.display = 'none';
      document.getElementById('group-tab-join').style.display = 'none';
      
      const tabElement = Array.from(document.querySelectorAll('#new-group-modal .tab-item'))
        .find(t => t.textContent.toLowerCase().includes(tabId === 'create' ? 'crea' : 'unisciti'));
      if (tabElement) tabElement.classList.add('tab-active');
      
      document.getElementById(`group-tab-${tabId}`).style.display = 'block';
    };

    // Event listener per la sottomissione del form di creazione gruppo.
    // Intercetta l'evento di submit per prevenire il ricaricamento della pagina 
    // e inoltrare un payload JSON tramite fetch verso l'endpoint API dedicato.
    const createForm = document.getElementById('create-group-form');
    if (createForm) {
      createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('group-name').value;
        const desc = document.getElementById('group-description').value;
        try {
          const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc })
          });
          const data = await res.json();
          if (data.success) {
            window.location.href = `/groups/${data.group.id}`;
          } else {
            alert(data.error);
          }
        } catch (err) {
          alert('Errore di rete');
        }
      });
    }

    // Invio del codice invito per unirsi a un gruppo
    const joinForm = document.getElementById('join-group-form');
    if (joinForm) {
      joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inviteCode = document.getElementById('invite-code').value;
        try {
          const res = await fetch('/api/groups/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteCode })
          });
          const data = await res.json();
          if (data.success) {
            window.location.href = `/groups/${data.group.id}`;
          } else {
            alert(data.error);
          }
        } catch (err) {
          alert('Errore di rete');
        }
      });
    }
  }

  // Inizializzazione della componente Modale per la registrazione delle transazioni di spesa.
  // Include la gestione dello stato UI per la ripartizione equa o personalizzata degli importi.
  const expenseModal = document.getElementById('expense-modal');
  if (expenseModal) {
    const btnExpense = document.getElementById('open-expense-modal');
    const btnExpenseMobile = document.getElementById('mobile-expense-btn');
    const closeExpense = document.getElementById('close-expense-modal');
    const form = document.getElementById('new-expense-form');

    const openExpense = (e) => { e.preventDefault(); expenseModal.classList.add('active'); };
    if (btnExpense) btnExpense.addEventListener('click', openExpense);
    if (btnExpenseMobile) btnExpenseMobile.addEventListener('click', openExpense);
    if (closeExpense) closeExpense.addEventListener('click', () => expenseModal.classList.remove('active'));

    // Logica di selezione UI per la componente a pillole (Category selector).
    // Sincronizza lo stato visivo delle pillole con l'input hidden correlato.
    document.querySelectorAll('#category-pills .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#category-pills .pill').forEach(p => p.classList.remove('pill-active'));
        pill.classList.add('pill-active');
        document.getElementById('category').value = pill.getAttribute('data-value');
      });
    });

    // Gestione dello switch di modalità per la ripartizione della spesa 
    // (Equa vs Personalizzata) mediante toggling dinamico della visibilità dei container.
    let currentSplitMode = 'equal';
    const btnEqual = document.getElementById('btn-split-equal');
    const btnCustom = document.getElementById('btn-split-custom');
    const contEqual = document.getElementById('split-equal-container');
    const contCustom = document.getElementById('split-custom-container');

    btnEqual.addEventListener('click', () => {
      currentSplitMode = 'equal';
      btnEqual.classList.add('active-split');
      btnEqual.classList.replace('btn-secondary', 'btn-primary');
      btnCustom.classList.remove('active-split');
      btnCustom.classList.replace('btn-primary', 'btn-secondary');
      contEqual.style.display = 'block';
      contCustom.style.display = 'none';
    });

    btnCustom.addEventListener('click', () => {
      currentSplitMode = 'custom';
      btnCustom.classList.add('active-split');
      btnCustom.classList.replace('btn-secondary', 'btn-primary');
      btnEqual.classList.remove('active-split');
      btnEqual.classList.replace('btn-primary', 'btn-secondary');
      contCustom.style.display = 'block';
      contEqual.style.display = 'none';
    });
    
    // Impostazioni iniziali (divisione equa)
    btnEqual.classList.replace('btn-secondary', 'btn-primary');

    // Listener reattivo per il calcolo cumulativo in tempo reale delle quote personalizzate.
    // Aggiorna l'etichetta del totale per fornire feedback di validazione istantaneo.
    const customInputs = document.querySelectorAll('.custom-share-input');
    const customTotalLabel = document.getElementById('custom-split-total');
    customInputs.forEach(input => {
      input.addEventListener('input', () => {
        let total = 0;
        customInputs.forEach(i => {
          const val = parseFloat(i.value);
          if (!isNaN(val) && val > 0) total += val;
        });
        customTotalLabel.textContent = `€${total.toFixed(2)}`;
      });
    });

    // Salva la spesa chiamando le API
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const groupId = document.getElementById('groupId').value;
      const amount = document.getElementById('amount').value;
      const description = document.getElementById('description').value;
      const category = document.getElementById('category').value;
      
      const payload = { groupId, amount, description, category, splitMode: currentSplitMode };

      if (currentSplitMode === 'equal') {
        const checkboxes = document.querySelectorAll('.participant-cb:checked');
        payload.participants = Array.from(checkboxes).map(cb => cb.value);
      } else {
        const shares = {};
        const participants = [];
        customInputs.forEach(i => {
          const val = parseFloat(i.value);
          if (!isNaN(val) && val > 0) {
            const uid = i.getAttribute('data-user-id');
            shares[uid] = val;
            participants.push(uid);
          }
        });
        payload.shares = shares;
        payload.participants = participants;
      }

      try {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          window.location.reload(); // Ricarica la pagina per vedere i dati aggiornati
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert('Errore di rete');
      }
    });
  }

  // Finestra per registrare un rimborso diretto tra due persone
  const reimburseModal = document.getElementById('reimburse-modal');
  if (reimburseModal) {
    const btnReimburse = document.getElementById('open-reimburse-modal');
    const closeReimburse = document.getElementById('close-reimburse-modal');
    const formReimburse = document.getElementById('new-reimbursement-form');

    if (btnReimburse) btnReimburse.addEventListener('click', (e) => { e.preventDefault(); reimburseModal.classList.add('active'); });
    if (closeReimburse) closeReimburse.addEventListener('click', () => reimburseModal.classList.remove('active'));

    if (formReimburse) {
      formReimburse.addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupId = document.getElementById('r-groupId').value;
        const toUserId = document.getElementById('r-toUserId').value;
        const amount = document.getElementById('r-amount').value;

        try {
          const res = await fetch('/api/reimbursements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId, toUserId, amount })
          });
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          } else {
            alert(data.error || 'Errore durante la registrazione del rimborso.');
          }
        } catch (err) {
          alert('Errore di rete');
        }
      });
    }
  }

  // Gestione dell'azione rapida per la copia del codice d'invito.
  // Interfaccia con la Clipboard API fornendo un feedback visivo effimero allo scatto.
  const badge = document.getElementById('invite-badge');
  if (badge) {
    badge.addEventListener('click', () => {
      const text = badge.querySelector('strong').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const original = badge.innerHTML;
        badge.innerHTML = '<strong>Copiato!</strong>';
        setTimeout(() => badge.innerHTML = original, 2000);
      });
    });
  }

  const deleteBtn = document.getElementById('delete-group-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Sei sicuro di voler eliminare il gruppo? TUTTI i dati andranno persi.')) return;
      
      let groupId = document.getElementById('groupId') ? document.getElementById('groupId').value : null;
      if (!groupId) {
        // Prova a leggere l'ID dall'URL se manca il campo nascosto
        const path = window.location.pathname.split('/');
        groupId = path[path.length-1];
      }
      if (!groupId) return;

      try {
        const res = await fetch(`/api/groups/${groupId}/delete`, { method: 'POST' });
        const data = await res.json();
        if (data.success) window.location.href = '/groups';
        else alert(data.error);
      } catch(e) {
        alert('Errore di rete');
      }
    });
  }

  // Implementazione di un meccanismo di short-polling per l'aggiornamento asincrono dei saldi.
  // Esegue richieste periodiche all'endpoint REST ogni 15 secondi per re-idratare 
  // il container dei bilanci senza impattare sul thread principale.
  const balContainer = document.getElementById('balances-container');
  if (balContainer) {
    const groupId = balContainer.getAttribute('data-group-id');
    setInterval(async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/balances`);
        const data = await res.json();
        if (data.balances) {
          balContainer.innerHTML = data.balances.map(b => {
            const cssClass = b.saldo >= 0 ? 'credit' : 'debt';
            const sign = b.saldo >= 0 ? '+' : '';
            const amount = Math.abs(b.saldo).toFixed(2);
            return `
              <div class="balance-row">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div class="avatar avatar-sm" style="background: var(--color-brand-100); color: var(--color-brand-700);">${b.name.charAt(0).toUpperCase()}</div>
                  <span class="member-name">${b.name}</span>
                </div>
                <span class="balance ${cssClass}">${sign}€${amount}</span>
              </div>
            `;
          }).join('');
        }
      } catch(e) { /* ignore */ }
    }, 15000);
  }

  // Inizializzazione del componente Chart.js per la rappresentazione statistica delle spese.
  // Deserializza il payload JSON precaricato nel DOM dal backend.
  const statsScript = document.getElementById('stats-data');
  const canvas = document.getElementById('categoryChart');
  
  if (statsScript && canvas && typeof Chart !== 'undefined') {
    try {
      const stats = JSON.parse(statsScript.textContent);
      if (stats && stats.length > 0) {
        const labels = stats.map(s => s.category);
        const data = stats.map(s => s.total);
        
        // Palette coordinata
        const colors = [
          '#6366F1', // brand
          '#10B981', // success
          '#F59E0B', // warning
          '#F43F5E', // danger
          '#8B5CF6', // purple
          '#EC4899', // pink
          '#64748B'  // gray
        ];

        new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colors.slice(0, stats.length),
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` €${parseFloat(ctx.raw).toFixed(2)}`
                }
              }
            }
          }
        });
      }
    } catch(e) { console.error('Errore inizializzazione grafico', e); }
  }
});
