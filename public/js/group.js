/**
 * group.js
 * Logica per la pagina dettaglio del gruppo con UI ridisegnata.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica utente
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
    const groupAvatarLetter = document.getElementById('group-avatar-letter');
    const inviteCodeDisplay = document.getElementById('group-invite-code-display');
    const groupMembersCount = document.getElementById('group-members-count');
    
    const membersList = document.getElementById('members-list');
    const addExpenseForm = document.getElementById('add-expense-form');
    const expensesList = document.getElementById('expenses-list');
    const suggestedSettlementsList = document.getElementById('suggested-settlements-list');
    const pastSettlementsList = document.getElementById('past-settlements-list');
    
    if (!groupId) {
        if(groupTitle) groupTitle.textContent = 'Errore: Gruppo non trovato.';
        return;
    }

    let currentGroup = null;
    let usersMap = {}; 
    let expenseChart = null; 
    let trendChart = null;
    const eurFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

    // Modals
    const expenseModal = document.getElementById('expense-modal');
    const fabAddExpense = document.getElementById('fab-add-expense');
    const closeModalBtn = document.getElementById('close-modal-btn');

    if (fabAddExpense && expenseModal && closeModalBtn) {
        fabAddExpense.addEventListener('click', () => {
            expenseModal.classList.add('active');
            // reset form and pills
            addExpenseForm.reset();
            document.querySelectorAll('#category-pills .pill').forEach(p => p.classList.remove('pill-active'));
            document.querySelector('#category-pills .pill[data-value="Generale"]')?.classList.add('pill-active');
            document.getElementById('category').value = 'Generale';

            document.querySelectorAll('.split-option').forEach(o => o.classList.remove('active'));
            document.querySelector('.split-option[data-mode="equal"]')?.classList.add('active');
            const splitMode = document.getElementById('splitMode');
            splitMode.value = 'equal';
            splitMode.dispatchEvent(new Event('change'));
        });
        closeModalBtn.addEventListener('click', () => expenseModal.classList.remove('active'));
        expenseModal.addEventListener('click', (e) => {
            if (e.target === expenseModal) expenseModal.classList.remove('active');
        });
    }

    // Inizializza
    init();

    async function init() {
        showSkeletons();
        await loadGroupDetails();
        if (currentGroup) {
            await loadExpenses();
            await loadSettlements();
        }
    }

    function showSkeletons() {
        if (expensesList && window.createListSkeleton) expensesList.innerHTML = window.createListSkeleton(5);
        if (membersList && window.createGridSkeleton) membersList.innerHTML = window.createGridSkeleton(4);
        if (suggestedSettlementsList && window.createListSkeleton) suggestedSettlementsList.innerHTML = window.createListSkeleton(2);
    }

    function getAvatarHtml(nome, cognome, cssClass="avatar-md", colorClass="bg-brand") {
        const init = (nome.charAt(0) + (cognome ? cognome.charAt(0) : '')).toUpperCase();
        return `<span class="avatar ${cssClass}" style="background: var(--color-brand-400);">${init}</span>`;
    }

    // ==========================================
    // DETTAGLIO GRUPPO
    // ==========================================
    async function loadGroupDetails() {
        try {
            const response = await fetch(`/api/groups/${groupId}`);
            if (!response.ok) throw new Error('Impossibile recuperare il gruppo.');
            currentGroup = await response.json();

            // Header Info
            if (groupTitle) groupTitle.textContent = currentGroup.name;
            if (groupAvatarLetter) groupAvatarLetter.textContent = currentGroup.name.charAt(0).toUpperCase();
            if (groupMembersCount) groupMembersCount.textContent = `${currentGroup.members.length} membri`;

            const isAdmin = currentGroup.adminId === loggedUser.id;
            if (inviteCodeDisplay) {
                inviteCodeDisplay.textContent = `INVITO: ${currentGroup.inviteCode}`;
                inviteCodeDisplay.addEventListener('click', () => {
                    navigator.clipboard.writeText(currentGroup.inviteCode);
                    window.showNotification('Codice invito copiato!');
                });
            }

            if (isAdmin) {
                const adminSection = document.getElementById('admin-section');
                if (adminSection) adminSection.style.display = 'block';
            }

            // Membri
            if (membersList) membersList.innerHTML = '';
            usersMap = {};

            currentGroup.members.forEach(member => {
                usersMap[member.id] = { nome: member.nome, cognome: member.cognome };

                const isMemberAdmin = member.id === currentGroup.adminId;
                const isMe = member.id === loggedUser.id;

                const card = document.createElement('div');
                card.className = 'member-card';

                let badgesHtml = '';
                if (isMemberAdmin) badgesHtml += `<span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px;">Admin</span>`;
                if (isMe) badgesHtml += `<span class="badge badge-info" style="font-size: 10px; padding: 2px 6px;">Tu</span>`;

                card.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0;">
                        ${getAvatarHtml(member.nome, member.cognome)}
                        ${badgesHtml ? `<div style="display: flex; flex-direction: column; gap: 4px;">${badgesHtml}</div>` : ''}
                    </div>
                    <div class="member-info" style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                        <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); word-break: break-word;">${member.nome} ${member.cognome || ''}</h4>
                        ${member.email ? `<span style="font-size: 13px; color: var(--text-secondary); word-break: break-all;">${member.email}</span>` : ''}
                    </div>
                `;

                if (isAdmin && !isMe && !isMemberAdmin) {
                    const kickBtn = document.createElement('button');
                    kickBtn.className = 'btn-ghost';
                    kickBtn.style.color = 'var(--color-danger-500)';
                    kickBtn.style.padding = '8px';
                    kickBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
                    kickBtn.title = 'Espelli dal gruppo';
                    kickBtn.addEventListener('click', () => handleKickMember(member.id, member.nome));
                    card.appendChild(kickBtn);
                }

                if (membersList) membersList.appendChild(card);
            });

            // Partecipanti Modale Spesa
            const participantsContainer = document.getElementById('participants-container');
            if (participantsContainer) {
                let html = '<label>Chi partecipa a questa spesa?</label><div style="display:flex; flex-direction:column; gap:0; background: var(--bg-card); border: var(--border-default); border-radius: var(--radius-md); overflow: hidden;">';
                currentGroup.members.forEach(member => {
                    const isMe = member.id === loggedUser.id;
                    const nomeStr = isMe ? 'Tu' : member.nome;
                    html += `
                        <div class="participant-row" style="padding: 12px 16px;">
                            <label style="display:flex; align-items:center; gap:12px; cursor:pointer; margin:0; flex-grow:1; text-transform: none; font-size: 14px;">
                                <input type="checkbox" name="participants" value="${member.id}" checked style="width: 18px; height: 18px; accent-color: var(--color-brand-500);">
                                ${nomeStr}
                            </label>
                            <input type="number" class="input custom-quota-input" data-user-id="${member.id}" placeholder="0.00" step="0.01" min="0" style="display:none; width: 100px; padding: 6px 12px;">
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
        if (!confirm(`Sei sicuro di voler espellere ${memberName}?`)) return;

        try {
            const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: loggedUser.id })
            });

            if (response.ok) {
                window.showNotification(`${memberName} espulso.`);
                await init(); 
            } else {
                const data = await response.json();
                window.showNotification(data.error, true);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // ==========================================
    // AGGIUNGI SPESA
    // ==========================================
    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const description = document.getElementById('description').value.trim();
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;

            if (!description || isNaN(amount) || amount <= 0) return;

            const checkboxes = document.querySelectorAll('input[name="participants"]:checked');
            const participantsId = Array.from(checkboxes).map(cb => cb.value);

            if (participantsId.length === 0) {
                window.showNotification('Seleziona almeno un partecipante.', true);
                return;
            }

            const splitMode = document.getElementById('splitMode').value;
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
                    groupId, description, amount, payerId: loggedUser.id,
                    requesterId: loggedUser.id, participantsId, category, customSplits
                };

                const response = await fetch('/api/expenses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    window.showNotification('Spesa aggiunta!');
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
    }

    // ==========================================
    // SPESE E GRAFICI
    // ==========================================
    async function loadExpenses() {
        try {
            const response = await fetch(`/api/expenses/group/${groupId}`);
            const expenses = await response.json();

            if (expensesList) expensesList.innerHTML = '';
            
            if (expenses.length === 0) {
                if (expensesList) expensesList.innerHTML = `<div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"></path><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                    <p>Nessuna spesa. Aggiungi la prima!</p>
                </div>`;
            } else {
                expenses.reverse().forEach(exp => {
                    const payerObj = usersMap[exp.payerId] || { nome: 'Utente', cognome: '' };
                    
                    const catIcons = { 'Generale':'🏷️', 'Cibo':'🍔', 'Trasporti':'🚗', 'Alloggio':'🏠', 'Svago':'🎟️', 'Spesa':'🛒' };
                    const icon = catIcons[exp.category] || '🏷️';
                    
                    const div = document.createElement('div');
                    div.className = 'expense-item animate-in';
                    div.innerHTML = `
                        <div class="expense-icon">${icon}</div>
                        <div class="expense-content">
                            <div class="expense-title">${exp.description}</div>
                            <div class="expense-meta">
                                Pagato da ${payerObj.nome}
                            </div>
                        </div>
                        <div class="expense-amount-area">
                            <div class="expense-amount amount-negative">${eurFormatter.format(exp.amount)}</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${new Date(exp.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</div>
                        </div>
                    `;
                    if (expensesList) expensesList.appendChild(div);
                });
            }

            updateCharts(expenses);

        } catch (error) {
            console.error(error);
        }
    }

    function updateCharts(expenses) {
        // 1. DOUGHNUT CHART (Categoria)
        const ctxDoughnut = document.getElementById('expenses-chart');
        if (ctxDoughnut) {
            const categoryTotals = {};
            expenses.forEach(exp => {
                const cat = exp.category || 'Generale';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
            });
            const labels = Object.keys(categoryTotals);
            const data = Object.values(categoryTotals);

            const colorMap = { 'Generale': '#94a3b8', 'Cibo': '#F43F5E', 'Trasporti': '#3b82f6', 'Alloggio': '#8b5cf6', 'Svago': '#f59e0b', 'Spesa': '#10b981' };
            const bgColors = labels.map(l => colorMap[l] || '#cbd5e1');

            if (expenseChart) expenseChart.destroy();
            
            if (data.length > 0) {
                expenseChart = new Chart(ctxDoughnut, {
                    type: 'doughnut',
                    data: { labels: labels, datasets: [{ data: data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 4 }] },
                    options: {
                        responsive: true, maintainAspectRatio: false, cutout: '75%',
                        plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } } }
                    }
                });
            }
        }


    }

    // ==========================================
    // RIMBORSI E PDF
    // ==========================================
    async function loadSettlements() {
        try {
            const response = await fetch(`/api/groups/${groupId}/settlements`);
            const data = await response.json();

            if (suggestedSettlementsList) {
                suggestedSettlementsList.innerHTML = '';
                if (data.suggestedSettlements.length === 0) {
                    suggestedSettlementsList.innerHTML = `<div class="empty-state" style="padding: 16px;"><p>Tutti i conti sono in pari!</p></div>`;
                } else {
                    data.suggestedSettlements.forEach(s => {
                        const debtor = usersMap[s.debtorId] || { nome: 'Utente' };
                        const creditor = usersMap[s.creditorId] || { nome: 'Utente' };
                        const isMyDebt = s.debtorId === loggedUser.id;

                        const card = document.createElement('div');
                        card.className = 'settlement-card animate-in';
                        card.innerHTML = `
                            <div class="settlement-flow">
                                ${getAvatarHtml(debtor.nome, debtor.cognome, 'avatar-sm')}
                                <strong style="font-size: 14px;">${debtor.nome}</strong>
                                
                                <div class="settlement-arrow">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                </div>
                                
                                ${getAvatarHtml(creditor.nome, creditor.cognome, 'avatar-sm', 'bg-neutral')}
                                <strong style="font-size: 14px;">${creditor.nome}</strong>
                            </div>
                            
                            <div class="settlement-action" style="display: flex; align-items: center; gap: 16px;">
                                <span class="amount-negative" style="font-size: 18px; font-weight: 700;">${eurFormatter.format(s.amount)}</span>
                                ${isMyDebt ? `<button class="btn btn-primary" data-debtor="${s.debtorId}" data-creditor="${s.creditorId}" data-amount="${s.amount}">Salda</button>` : ''}
                            </div>
                        `;

                        // Attach event listener for settle
                        if (isMyDebt) {
                            card.querySelector('button').addEventListener('click', () => handleSettle(s.debtorId, s.creditorId, s.amount));
                        }

                        suggestedSettlementsList.appendChild(card);
                    });
                }
            }

            if (pastSettlementsList) {
                pastSettlementsList.innerHTML = '';
                if (data.pastSettlements.length === 0) {
                    pastSettlementsList.innerHTML = `<div class="empty-state" style="padding: 16px;"><p>Nessun rimborso effettuato finora.</p></div>`;
                } else {
                    data.pastSettlements.reverse().forEach(s => {
                        const payer = usersMap[s.payerId] || { nome: 'Utente' };
                        const payee = usersMap[s.payeeId] || { nome: 'Utente' };
                        
                        const div = document.createElement('div');
                        div.className = 'expense-item';
                        div.innerHTML = `
                            <div class="expense-icon" style="background: var(--color-success-50); color: var(--color-success-500);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div class="expense-content">
                                <div class="expense-title">Rimborso inviato</div>
                                <div class="expense-meta">${payer.nome} ha pagato ${payee.nome}</div>
                            </div>
                            <div class="expense-amount-area">
                                <div class="expense-amount amount-positive">${eurFormatter.format(s.amount)}</div>
                            </div>
                        `;
                        pastSettlementsList.appendChild(div);
                    });
                }
            }

        } catch (error) {
            console.error(error);
        }
    }

    async function handleSettle(payerId, payeeId, amount) {
        try {
            const response = await fetch('/api/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, payerId, payeeId, amount, requesterId: loggedUser.id })
            });

            if (response.ok) {
                window.showNotification('Rimborso confermato!');
                await loadSettlements();
            } else {
                const err = await response.json();
                window.showNotification(err.error, true);
            }
        } catch (error) {
            console.error(error);
        }
    }

    const closeGroupBtn = document.getElementById('close-group-btn');
    if (closeGroupBtn) {
        closeGroupBtn.addEventListener('click', async () => {
            if (!confirm('ATTENZIONE: Eliminare il gruppo è irreversibile. Confermi?')) return;
            try {
                const response = await fetch(`/api/groups/${groupId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminId: loggedUser.id })
                });

                if (response.ok) {
                    alert('Gruppo chiuso definitivamente.');
                    window.location.href = 'dashboard.html';
                } else {
                    const data = await response.json();
                    window.showNotification(data.error, true);
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalHtml = exportPdfBtn.innerHTML;
            exportPdfBtn.innerHTML = '<span>Generazione...</span>';
            exportPdfBtn.style.opacity = '0.7';
            exportPdfBtn.style.pointerEvents = 'none';

            try {
                let chartImage = null;
                const canvas = document.getElementById('expenses-chart');
                if (canvas) chartImage = canvas.toDataURL('image/png');

                const response = await fetch(`/api/groups/${groupId}/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chartImage })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Qotly_Report_${currentGroup.name.replace(/\s+/g, '_')}.pdf`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                } else {
                    window.showNotification('Errore esportazione', true);
                }
            } catch (error) {
                console.error(error);
                window.showNotification('Errore di rete', true);
            } finally {
                exportPdfBtn.innerHTML = originalHtml;
                exportPdfBtn.style.opacity = '1';
                exportPdfBtn.style.pointerEvents = 'auto';
            }
        });
    }
});
