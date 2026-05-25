// public/app.js
// Logica client-side Qotly (AJAX, modali, tabs, grafici)

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // FLASH MESSAGES (Auto-dismiss)
  // ==========================================
  const flashMessage = document.getElementById('flash-message');
  if (flashMessage) {
    setTimeout(() => {
      flashMessage.style.animation = 'flashFadeOut 0.5s ease forwards';
      setTimeout(() => flashMessage.remove(), 500);
    }, 5000);
  }

  // ==========================================
  // TABS SYSTEM (Globale)
  // ==========================================
  const setupTabs = (tabSelector, contentSelector) => {
    const tabs = document.querySelectorAll(tabSelector);
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        // Remove active class da tutti
        document.querySelectorAll(tabSelector).forEach(t => t.classList.remove('tab-active', 'active'));
        document.querySelectorAll(contentSelector).forEach(c => c.style.display = 'none');

        // Add active class al target
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

  // Setup tabs dashboard (sidebar nav) e dettaglio gruppo
  setupTabs('.nav-link[data-target]', '.tab-content');
  setupTabs('.bnav-link[data-target]', '.tab-content');
  setupTabs('.tabs .tab-item[data-target]', '.tab-content');

  // ==========================================
  // MODALE GRUPPI (Crea / Unisciti) - Dashboard
  // ==========================================
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

    // Toggle logica interno modale (Crea vs Join)
    window.showGroupTab = (tabId) => {
      document.querySelectorAll('#new-group-modal .tab-item').forEach(t => t.classList.remove('tab-active'));
      document.getElementById('group-tab-create').style.display = 'none';
      document.getElementById('group-tab-join').style.display = 'none';
      
      const tabElement = Array.from(document.querySelectorAll('#new-group-modal .tab-item'))
        .find(t => t.textContent.toLowerCase().includes(tabId === 'create' ? 'crea' : 'unisciti'));
      if (tabElement) tabElement.classList.add('tab-active');
      
      document.getElementById(`group-tab-${tabId}`).style.display = 'block';
    };

    // Submit form Creazione AJAX
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

    // Submit form Join AJAX
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

  // ==========================================
  // DETTAGLIO GRUPPO: Modale Spesa & Split Custom
  // ==========================================
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

    // Category pills logic
    document.querySelectorAll('#category-pills .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#category-pills .pill').forEach(p => p.classList.remove('pill-active'));
        pill.classList.add('pill-active');
        document.getElementById('category').value = pill.getAttribute('data-value');
      });
    });

    // Split UI logic
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
    
    // Inizializza pulsanti (equal è di default)
    btnEqual.classList.replace('btn-secondary', 'btn-primary');

    // Calcolo live totale custom
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

    // Submit Spesa AJAX
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

  // ==========================================
  // AZIONI GRUPPO: Copia Invito, Elimina Gruppo
  // ==========================================
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
      
      const groupId = document.getElementById('groupId') ? document.getElementById('groupId').value : null;
      if (!groupId) {
        // Fallback per ricavare l'ID dall'URL se non c'è input hidden
        const path = window.location.pathname.split('/');
        const id = path[path.length-1];
        if(!id) return;
        try {
          const res = await fetch(`/api/groups/${id}/delete`, { method: 'POST' });
          const data = await res.json();
          if (data.success) window.location.href = '/groups';
          else alert(data.error);
        } catch(e) {}
      }
    });
  }

  // ==========================================
  // SALDI LIVE AJAX (Polling)
  // ==========================================
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

  // ==========================================
  // CHART.JS (Statistiche Categoria)
  // ==========================================
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
