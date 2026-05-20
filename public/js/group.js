/**
 * group.js
 * Logica per la pagina dettaglio del gruppo, inclusa sicurezza sui bottoni "Salda".
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica utente loggato
    const userString = localStorage.getItem('user');
    if (!userString) {
        window.location.href = 'login.html';
        return;
    }
    const loggedUser = JSON.parse(userString);

    // 2. Estrai groupId
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('id');

    // DOM Elements
    const groupTitle = document.getElementById('group-title');
    const inviteCodeContainer = document.getElementById('invite-code-container');
    const groupInviteCode = document.getElementById('group-invite-code');
    const membersList = document.getElementById('members-list');
    const addExpenseForm = document.getElementById('add-expense-form');
    const expensesList = document.getElementById('expenses-list');
    const suggestedSettlementsList = document.getElementById('suggested-settlements-list');
    const pastSettlementsList = document.getElementById('past-settlements-list');

    if (!groupId) {
        groupTitle.textContent = 'Errore: Gruppo non trovato.';
        return;
    }

    let currentGroup = null;
    let usersMap = {}; // Mappa: ID -> {nome, cognome}
    let expenseChart = null; // Variabile per mantenere l'istanza del grafico

    // Helper per l'Avatar
    function getAvatarHtml(nome, cognome) {
        const init = (nome.charAt(0) + (cognome ? cognome.charAt(0) : '')).toUpperCase();
        const colors = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#475569', '#64748b', '#4f46e5', '#4338ca', '#0284c7', '#0369a1', '#0f172a'];
        const num = Array.from(nome + cognome).reduce((a, b) => a + b.charCodeAt(0), 0);
        const bg = colors[num % colors.length];
        return `<span class="avatar" style="background:${bg};">${init}</span>`;
    }

    // WebSockets setup
    const socket = io();
    socket.emit('join_group', groupId);

    socket.on('update_data', (message) => {
        // Se qualcun altro ha aggiunto spese/rimborsi, ricarica
        console.log('Nuovi dati ricevuti via socket:', message);
        window.showNotification('Dati aggiornati in tempo reale!', false);
        loadExpenses();
        loadSettlements();
    });


    // Modal Logic
    const expenseModal = document.getElementById('expense-modal');
    const fabAddExpense = document.getElementById('fab-add-expense');
    const closeModalBtn = document.getElementById('close-modal-btn');

    if (fabAddExpense && expenseModal && closeModalBtn) {
        fabAddExpense.addEventListener('click', () => expenseModal.classList.add('active'));
        closeModalBtn.addEventListener('click', () => expenseModal.classList.remove('active'));
        expenseModal.addEventListener('click', (e) => {
            if (e.target === expenseModal) expenseModal.classList.remove('active');
        });
    }

    // Mobile Tabs Logic
    const mTabs = document.querySelectorAll('.m-tab');
    mTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            mTabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked tab
            tab.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.m-section').forEach(sec => sec.classList.remove('m-active'));
            // Show target section(s)
            const targetClass = tab.getAttribute('data-target');
            document.querySelectorAll(`.${targetClass}`).forEach(sec => sec.classList.add('m-active'));
        });
    });

    // Inizializza l'interfaccia
    init();

    async function init() {
        await loadGroupDetails();
        if (currentGroup) {
            await loadExpenses();
            await loadSettlements();
        }
    }

    // ==========================================
    // DETTAGLIO GRUPPO E MEMBRI
    // ==========================================
    async function loadGroupDetails() {
        try {
            const response = await fetch(`/api/groups/${groupId}`);
            if (!response.ok) throw new Error('Impossibile recuperare il gruppo.');
            currentGroup = await response.json();

            // Titolo
            groupTitle.textContent = currentGroup.name;

            // Se l'utente è l'admin, mostra funzionalità extra
            const isAdmin = currentGroup.adminId === loggedUser.id;
            if (isAdmin) {
                inviteCodeContainer.style.display = 'flex';
                groupInviteCode.textContent = currentGroup.inviteCode;
                
                const adminSection = document.getElementById('admin-section');
                if (adminSection) adminSection.style.display = 'block';
            }

            // Popola Mappa Membri e renderizza lista
            membersList.innerHTML = '';
            usersMap = {};

            currentGroup.members.forEach(member => {
                usersMap[member.id] = { nome: member.nome, cognome: member.cognome };

                const isMemberAdmin = member.id === currentGroup.adminId;
                const isMe = member.id === loggedUser.id;

                const memberDiv = document.createElement('div');
                memberDiv.className = 'expense-item';
                memberDiv.style.flexDirection = 'row';
                memberDiv.style.justifyContent = 'space-between';
                memberDiv.style.alignItems = 'center';
                memberDiv.style.padding = '0.75rem 1rem';

                let badge = '';
                if (isMemberAdmin) {
                    badge = `<span style="background: var(--warning-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 0.5rem;">Admin</span>`;
                }
                if (isMe) {
                    badge += `<span style="background: var(--primary-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 0.5rem;">Tu</span>`;
                }

                const avatarHtml = getAvatarHtml(member.nome, member.cognome);
                memberDiv.innerHTML = `<div style="display:flex; align-items:center;">${avatarHtml} <strong>${member.nome} ${member.cognome || ''}</strong> ${badge}</div>`;

                // Tasto Espelli: visibile solo all'admin per espellere ALTRI membri
                if (isAdmin && !isMe && !isMemberAdmin) {
                    const kickBtn = document.createElement('button');
                    kickBtn.className = 'btn btn-danger';
                    kickBtn.style.padding = '0.3rem 0.6rem';
                    kickBtn.style.fontSize = '0.8rem';
                    kickBtn.innerHTML = 'Espelli';
                    kickBtn.addEventListener('click', () => handleKickMember(member.id, member.nome));
                    memberDiv.appendChild(kickBtn);
                }

                membersList.appendChild(memberDiv);
            });

            // Popola le checkbox per i partecipanti alla spesa
            const participantsContainer = document.getElementById('participants-container');
            if (participantsContainer) {
                let html = '<label>Chi partecipa a questa spesa?</label><div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">';
                currentGroup.members.forEach(member => {
                    const isMe = member.id === loggedUser.id;
                    const nomeStr = isMe ? 'Tu' : member.nome;
                    html += `
                        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.05); padding:0.4rem 0.8rem; border-radius:12px; border: 1px solid var(--border-color);">
                            <label style="display:flex; align-items:center; gap:0.5rem; font-weight:normal; cursor:pointer; margin:0; flex-grow:1;">
                                <input type="checkbox" name="participants" value="${member.id}" checked>
                                ${nomeStr}
                            </label>
                            <input type="number" class="custom-quota-input" data-user-id="${member.id}" placeholder="€" step="0.01" min="0" style="display:none;">
                        </div>
                    `;
                });
                html += '</div>';
                participantsContainer.innerHTML = html;

                const splitModeSelect = document.getElementById('splitMode');
                if (splitModeSelect) {
                    splitModeSelect.addEventListener('change', (e) => {
                        const isCustom = e.target.value === 'custom';
                        document.querySelectorAll('.custom-quota-input').forEach(input => {
                            input.style.display = isCustom ? 'block' : 'none';
                            if (!isCustom) input.value = '';
                        });
                    });
                }
            }

        } catch (error) {
            console.error(error);
            window.showNotification('Errore di caricamento dati gruppo', true);
        }
    }

    async function handleKickMember(memberId, memberName) {
        if (!confirm(`Sei sicuro di voler espellere ${memberName}? (L'operazione non è distruttiva per i debiti precedenti)`)) {
            return;
        }

        try {
            const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: loggedUser.id })
            });

            if (response.ok) {
                window.showNotification(`${memberName} espulso con successo!`);
                await init(); // Ricarica tutto
            } else {
                const data = await response.json();
                window.showNotification(data.error, true);
            }
        } catch (error) {
            console.error(error);
            window.showNotification('Errore durante l\'espulsione', true);
        }
    }

    // ==========================================
    // SPESE (EXPENSES)
    // ==========================================
    addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const descInput = document.getElementById('description');
        const amountInput = document.getElementById('amount');
        descInput.classList.remove('input-error');
        amountInput.classList.remove('input-error');

        const description = descInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const categoryInput = document.getElementById('category');
        const category = categoryInput ? categoryInput.value : 'Generale';

        if (!description || description.length < 2) {
            descInput.classList.add('input-error');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            amountInput.classList.add('input-error');
            return;
        }

        // Recupera le checkbox selezionate
        const checkboxes = document.querySelectorAll('input[name="participants"]:checked');
        const participantsId = Array.from(checkboxes).map(cb => cb.value);

        if (participantsId.length === 0) {
            window.showNotification('Devi selezionare almeno un partecipante.', true);
            return;
        }

        const splitMode = document.getElementById('splitMode') ? document.getElementById('splitMode').value : 'equal';
        let customSplits = null;

        if (splitMode === 'custom') {
            customSplits = [];
            let totalCustom = 0;
            
            for (const cb of checkboxes) {
                const userId = cb.value;
                const input = document.querySelector(`.custom-quota-input[data-user-id="${userId}"]`);
                const val = parseFloat(input.value) || 0;
                customSplits.push({ userId, amountOwed: val });
                totalCustom += val;
            }

            if (Math.abs(totalCustom - amount) > 0.01) {
                window.showNotification(`La somma delle quote (€${totalCustom.toFixed(2)}) non coincide col totale (€${amount.toFixed(2)}).`, true);
                return;
            }
        }

        try {
            const payload = {
                groupId,
                description,
                amount,
                payerId: loggedUser.id,
                requesterId: loggedUser.id,
                participantsId,
                category,
                customSplits
            };

            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                window.showNotification('Spesa aggiunta con successo!');
                addExpenseForm.reset();
                if (expenseModal) expenseModal.classList.remove('active');
                await loadExpenses();
                await loadSettlements();
            } else {
                const data = await response.json();
                window.showNotification(data.error, true);
            }
        } catch (error) {
            console.error(error);
            window.showNotification('Errore di rete', true);
        }
    });

    const eurFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

    async function loadExpenses() {
        try {
            expensesList.innerHTML = `
                <div class="skeleton-box"></div>
                <div class="skeleton-box"></div>
                <div class="skeleton-box"></div>
            `;

            const response = await fetch(`/api/expenses/group/${groupId}`);
            const expenses = await response.json();

            expensesList.innerHTML = '';
            if (expenses.length === 0) {
                expensesList.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem 0; color: var(--text-muted); display:flex; flex-direction:column; align-items:center; gap:0.8rem;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4;"><path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"></path><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                        <p style="font-size: 0.95rem; margin:0;">Nessuna spesa. Clicca il <strong>+</strong> per iniziare!</p>
                    </div>`;
                updateChart([]);
                return;
            }

            expenses.reverse().forEach(exp => {
                const payerObj = usersMap[exp.payerId] || { nome: 'Utente', cognome: 'Espulso' };
                const avatarHtml = getAvatarHtml(payerObj.nome, payerObj.cognome);
                
                // Utilizzo del pattern strutturale <template> HTML5
                const template = document.getElementById('expense-item-template');
                const clone = template.content.cloneNode(true);
                
                const catIcons = {
                    'Generale': '🏷️',
                    'Cibo': '🍔',
                    'Trasporti': '🚗',
                    'Alloggio': '🏠',
                    'Svago': '🎟️',
                    'Spesa': '🛒'
                };
                const icon = catIcons[exp.category] || '🏷️';
                clone.querySelector('.expense-row-icon').innerHTML = `<span style="font-size: 1.3rem;">${icon}</span>`;
                
                clone.querySelector('.tpl-desc').textContent = exp.description;
                clone.querySelector('.tpl-amount').textContent = eurFormatter.format(exp.amount);
                clone.querySelector('.tpl-avatar').innerHTML = avatarHtml;
                clone.querySelector('.tpl-payer').textContent = payerObj.nome;
                clone.querySelector('.expense-item').classList.add('fade-in-row');
                
                expensesList.appendChild(clone);
            });

            // Disegna o aggiorna il Grafico
            updateChart(expenses);

        } catch (error) {
            console.error(error);
        }
    }

    function updateChart(expenses) {
        const ctx = document.getElementById('expenses-chart');
        if (!ctx) return;

        const categoryTotals = {};
        expenses.forEach(exp => {
            const cat = exp.category || 'Generale';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        // Se non ci sono dati, non distruggo/creo ma lascio vuoto
        if (data.length === 0 && expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
            return;
        }

        const colorMap = {
            'Generale': '#94a3b8',
            'Cibo': '#ef4444',
            'Trasporti': '#3b82f6',
            'Alloggio': '#8b5cf6',
            'Svago': '#f59e0b',
            'Spesa': '#10b981'
        };
        const bgColors = labels.map(l => colorMap[l] || '#cbd5e1');

        if (expenseChart) {
            expenseChart.destroy();
        }

        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            padding: 15,
                            font: { family: 'Inter', size: 12 }
                        }
                    }
                }
            }
        });
    }

    // ==========================================
    // RIMBORSI (SETTLEMENTS E SUGGESTED)
    // ==========================================
    async function loadSettlements() {
        try {
            const response = await fetch(`/api/groups/${groupId}/settlements`);
            const data = await response.json();

            // RIMBORSI SUGGERITI
            suggestedSettlementsList.innerHTML = '';
            if (data.suggestedSettlements.length === 0) {
                suggestedSettlementsList.innerHTML = `<p style="text-align: center; color: var(--success-color); padding: 1rem 0; font-weight: 500;">Tutti i conti sono in pari!</p>`;
            } else {
                data.suggestedSettlements.forEach(s => {
                    const debtorObj = usersMap[s.debtorId] || { nome: 'Utente', cognome: 'Uscito' };
                    const creditorObj = usersMap[s.creditorId] || { nome: 'Utente', cognome: 'Uscito' };
                    const isMyDebt = s.debtorId === loggedUser.id;
                    const isMyCredit = s.creditorId === loggedUser.id;

                    const div = document.createElement('div');
                    div.className = 'settlement-item';
                    
                    let textHtml = '';
                    if (isMyDebt) {
                        textHtml = `<span>Devi <strong class="amount-negative">&euro;${parseFloat(s.amount).toFixed(2)}</strong> a <strong>${creditorObj.nome}</strong></span>`;
                    } else if (isMyCredit) {
                        textHtml = `<span><strong>${debtorObj.nome}</strong> ti deve <strong class="amount-positive">&euro;${parseFloat(s.amount).toFixed(2)}</strong></span>`;
                    } else {
                        textHtml = `<span><strong>${debtorObj.nome}</strong> deve <strong class="amount-negative">&euro;${parseFloat(s.amount).toFixed(2)}</strong> a <strong>${creditorObj.nome}</strong></span>`;
                    }

                    div.innerHTML = `<div style="display:flex; align-items:center; gap:0.5rem;">
                        ${getAvatarHtml(debtorObj.nome, debtorObj.cognome)}
                        ${textHtml}
                    </div>`;

                    // Mostra il pulsante Salda SOLO se l'utente loggato è il debitore
                    if (isMyDebt) {
                        const btn = document.createElement('button');
                        btn.className = 'btn settle-btn';
                        btn.style.padding = '0.4rem 1rem';
                        btn.textContent = 'Salda Debito';
                        btn.addEventListener('click', () => handleSettle(s.debtorId, s.creditorId, s.amount));
                        div.appendChild(btn);
                    }

                    suggestedSettlementsList.appendChild(div);
                });
            }

            // STORICO RIMBORSI
            pastSettlementsList.innerHTML = '';
            if (data.pastSettlements.length === 0) {
                pastSettlementsList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);"><p>Nessun rimborso effettuato finora.</p></div>`;
            } else {
                data.pastSettlements.reverse().forEach(s => {
                    const payerObj = usersMap[s.payerId] || { nome: 'Utente', cognome: '' };
                    const payeeObj = usersMap[s.payeeId] || { nome: 'Utente', cognome: '' };
                    const div = document.createElement('div');
                    div.className = 'expense-item';
                    div.innerHTML = `
                        <div style="font-size: 0.95rem; display:flex; align-items:center; gap:0.5rem;">
                            ${getAvatarHtml(payerObj.nome, payerObj.cognome)}
                            <div>
                                <strong>${payerObj.nome}</strong> ha rimborsato <strong>${payeeObj.nome}</strong>
                                <div style="color: var(--success-color); font-weight: 700; margin-top: 0.1rem;">
                                    + &euro;${parseFloat(s.amount).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    `;
                    pastSettlementsList.appendChild(div);
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSettle(payerId, payeeId, amount) {
        try {
            const payload = {
                groupId,
                payerId,
                payeeId,
                amount,
                requesterId: loggedUser.id // Sicurezza backend: deve coincidere con payerId
            };

            const response = await fetch('/api/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                window.showNotification('Rimborso confermato con successo!');
                await loadSettlements();
            } else {
                const err = await response.json();
                window.showNotification(err.error, true);
            }
        } catch (error) {
            console.error(error);
            window.showNotification('Errore di connessione', true);
        }
    }

    // ==========================================
    // ADMIN E PDF
    // ==========================================
    const closeGroupBtn = document.getElementById('close-group-btn');
    if (closeGroupBtn) {
        closeGroupBtn.addEventListener('click', async () => {
            if (!confirm('ATTENZIONE: Stai per chiudere definitivamente il gruppo. Tutte le spese e i rimborsi verranno eliminati e non potranno essere recuperati. Vuoi procedere?')) {
                return;
            }
            try {
                const response = await fetch(`/api/groups/${groupId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminId: loggedUser.id })
                });

                if (response.ok) {
                    alert('Il gruppo è stato chiuso ed eliminato correttamente.');
                    window.location.href = '/html/dashboard.html';
                } else {
                    const data = await response.json();
                    window.showNotification(data.error || 'Errore nella chiusura', true);
                }
            } catch (err) {
                console.error(err);
                window.showNotification('Errore di rete durante la chiusura.', true);
            }
        });
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        // Rimuoviamo l'href nativo perché gestiamo noi il download via POST per inviare il grafico
        exportPdfBtn.removeAttribute('href');
        exportPdfBtn.style.cursor = 'pointer';
        
        exportPdfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const originalHtml = exportPdfBtn.innerHTML;
            exportPdfBtn.innerHTML = '<span class="desktop-only" style="margin-left: 5px;">Generazione...</span>';
            exportPdfBtn.style.opacity = '0.7';
            exportPdfBtn.style.pointerEvents = 'none';

            try {
                let chartImage = null;
                const canvas = document.getElementById('expenses-chart');
                if (canvas) {
                    // Cattura il grafico come immagine Base64
                    chartImage = canvas.toDataURL('image/png');
                }

                const response = await fetch(`/api/groups/${groupId}/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chartImage })
                });

                if (response.ok) {
                    // Creiamo un link per scaricare il blob binario ricevuto dal server
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Qotly_Report_${currentGroup.name.replace(/\s+/g, '_')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } else {
                    window.showNotification('Errore durante l\'esportazione del PDF', true);
                }
            } catch (error) {
                console.error(error);
                window.showNotification('Errore di rete durante l\'esportazione', true);
            } finally {
                exportPdfBtn.innerHTML = originalHtml;
                exportPdfBtn.style.opacity = '1';
                exportPdfBtn.style.pointerEvents = 'auto';
            }
        });
    }

});
