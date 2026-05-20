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

    // Imposta bottone PDF
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.href = `/api/groups/${groupId}/export`;
    }

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

            // Se l'utente è l'admin, mostra il codice di invito in alto
            const isAdmin = currentGroup.adminId === loggedUser.id;
            if (isAdmin) {
                inviteCodeContainer.style.display = 'flex';
                groupInviteCode.textContent = currentGroup.inviteCode;
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
                let html = '<label>Chi partecipa a questa spesa?</label><div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem;">';
                currentGroup.members.forEach(member => {
                    const isMe = member.id === loggedUser.id;
                    const nomeStr = isMe ? 'Tu' : member.nome;
                    html += `
                        <label style="display:flex; align-items:center; gap:0.3rem; background:rgba(255,255,255,0.4); padding:0.4rem 0.8rem; border-radius:12px; font-weight:normal; cursor:pointer; font-size: 0.9rem;">
                            <input type="checkbox" name="participants" value="${member.id}" checked>
                            ${nomeStr}
                        </label>
                    `;
                });
                html += '</div>';
                participantsContainer.innerHTML = html;
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

        try {
            const payload = {
                groupId,
                description,
                amount,
                payerId: loggedUser.id,
                requesterId: loggedUser.id,
                participantsId
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

    async function loadExpenses() {
        try {
            const response = await fetch(`/api/expenses/group/${groupId}`);
            const expenses = await response.json();

            expensesList.innerHTML = '';
            if (expenses.length === 0) {
                expensesList.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 1rem 0;">Nessuna spesa. Aggiungine una!</p>`;
                return;
            }

            expenses.reverse().forEach(exp => {
                const payerObj = usersMap[exp.payerId] || { nome: 'Utente', cognome: 'Espulso' };
                const avatarHtml = getAvatarHtml(payerObj.nome, payerObj.cognome);
                
                // Utilizzo del pattern strutturale <template> HTML5
                const template = document.getElementById('expense-item-template');
                const clone = template.content.cloneNode(true);
                
                clone.querySelector('.tpl-desc').textContent = exp.description;
                clone.querySelector('.tpl-amount').innerHTML = `&euro;${parseFloat(exp.amount).toFixed(2)}`;
                clone.querySelector('.tpl-avatar').innerHTML = avatarHtml;
                clone.querySelector('.tpl-payer').textContent = payerObj.nome;
                
                expensesList.appendChild(clone);
            });
        } catch (error) {
            console.error(error);
        }
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
});
