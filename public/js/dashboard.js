/**
 * dashboard.js
 * Gestisce la logica avanzata della dashboard SPA (Single Page Application).
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica autenticazione
    const userString = localStorage.getItem('user');
    if (!userString) {
        window.location.href = 'login.html';
        return;
    }

    let user = JSON.parse(userString);
    
    // UI Elements generici
    const welcomeText = document.getElementById('welcome-text');
    if (welcomeText) welcomeText.textContent = user.nome;
    
    // Popola i vari saluti mobile
    document.querySelectorAll('.mobile-welcome-name').forEach(e => e.textContent = user.nome);

    const profileAvatarLetter = document.getElementById('profile-avatar-letter');
    if (profileAvatarLetter) profileAvatarLetter.textContent = user.nome.charAt(0).toUpperCase();
    const topProfileAvatar = document.getElementById('top-profile-avatar-letter');
    if (topProfileAvatar) topProfileAvatar.textContent = user.nome.charAt(0).toUpperCase();
    
    let lastBalancesData = { totalOwed: 0, totalCredit: 0, details: [] };
    
    const logoutBtn = document.getElementById('logout-btn');
    const groupsListContainer = document.getElementById('groups-list');
    
    // Forms
    const createGroupForm = document.getElementById('create-group-form');
    const joinGroupForm = document.getElementById('join-group-form');
    const profileForm = document.getElementById('profile-form');
    
    // Profile Fields
    const profileName = document.getElementById('profile-name');
    const profileCognome = document.getElementById('profile-cognome');
    const profileEmail = document.getElementById('profile-email');
    const profilePassword = document.getElementById('profile-password');

    // Inizializza i campi del profilo
    profileName.value = user.nome;
    profileCognome.value = user.cognome || '';
    profileEmail.value = user.email;

    // Caricamento dati iniziali
    initData();

    async function initData() {
        await fetchUserGroups(user.id);
        await fetchUserBalances(user.id);
        await fetchRecentExpenses(user.id);
    }

    // ==========================================
    // GESTIONE NAVIGAZIONE E MODALI (TOP NAV)
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            // Rimuovi active da tutti i tab di navigazione
            document.querySelectorAll('#main-nav .nav-item').forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            // Aggiungi active al link cliccato
            if (item.closest('#main-nav')) {
                item.classList.add('active');
            } else {
                const navLink = document.querySelector(`#main-nav .nav-item[data-target="${targetId}"]`);
                if (navLink) navLink.classList.add('active');
            }
            
            const targetTab = document.getElementById(targetId);
            if (targetTab) targetTab.classList.add('active');
            
            if (targetId === 'tab-home' || targetId === 'tab-groups') {
                initData(); 
            }
        });
    });

    const newGroupModal = document.getElementById('new-group-modal');
    const btnNuovoNav = document.getElementById('nav-btn-nuovo');
    const btnNuovoAlt = document.getElementById('alt-nuovo-gruppo-btn');
    const closeNewGroupModal = document.getElementById('close-new-group-modal');

    function openNewGroupModal() {
        if (newGroupModal) newGroupModal.classList.add('active');
    }

    if (btnNuovoNav) btnNuovoNav.addEventListener('click', openNewGroupModal);
    if (btnNuovoAlt) btnNuovoAlt.addEventListener('click', openNewGroupModal);
    if (closeNewGroupModal) {
        closeNewGroupModal.addEventListener('click', () => {
            newGroupModal.classList.remove('active');
        });
    }


    // ==========================================
    // SEZIONE PROFILO UTENTE
    // ==========================================
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            nome: profileName.value.trim(),
            cognome: profileCognome.value.trim(),
            email: profileEmail.value.trim(),
        };

        if (profilePassword.value.trim().length > 0) {
            payload.password = profilePassword.value.trim();
        }

        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const updatedUser = await response.json();
                localStorage.setItem('user', JSON.stringify(updatedUser));
                user = updatedUser; 
                if (welcomeText) welcomeText.textContent = user.nome;
                document.querySelectorAll('.mobile-welcome-name').forEach(e => e.textContent = user.nome);
                if (profileAvatarLetter) profileAvatarLetter.textContent = user.nome.charAt(0).toUpperCase();
                const topProfileAvatarUpdate = document.getElementById('top-profile-avatar-letter');
                if (topProfileAvatarUpdate) topProfileAvatarUpdate.textContent = user.nome.charAt(0).toUpperCase();
                profilePassword.value = ''; 
                window.showNotification('Profilo aggiornato con successo!');
            } else {
                const data = await response.json();
                window.showNotification(data.error || 'Errore aggiornamento', true);
            }
        } catch (error) {
            console.error(error);
            window.showNotification('Errore di rete.', true);
        }
    });

    // ==========================================
    // CREAZIONE E UNIONE GRUPPI
    // ==========================================
    
    // Crea Gruppo
    createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupNameInput = document.getElementById('group-name');
        const groupName = groupNameInput.value.trim();

        if (!groupName) return;

        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: groupName, creatorId: user.id })
            });

            if (response.ok) {
                const newGroup = await response.json();
                window.showNotification(`Creato! Codice invito: ${newGroup.inviteCode}`);
                groupNameInput.value = '';
                
                // Torna al tab gruppi per vederlo e chiudi modale
                if (newGroupModal) newGroupModal.classList.remove('active');
                const targetLink = document.querySelector('.nav-item[data-target="tab-groups"]');
                if (targetLink) targetLink.click();
            } else {
                const errorData = await response.json();
                window.showNotification(errorData.error, true);
            }
        } catch (error) {
            console.error(error);
            window.showNotification('Errore di connessione', true);
        }
    });

    // Unisciti al Gruppo
    joinGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('invite-code');
        const inviteCode = codeInput.value.trim();

        if (inviteCode.length !== 6) {
            window.showNotification('Il codice deve avere 6 caratteri.', true);
            return;
        }

        try {
            const response = await fetch('/api/groups/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, inviteCode })
            });

            if (response.ok) {
                window.showNotification('Aggiunto al gruppo!');
                codeInput.value = '';
                // Torna al tab gruppi e chiudi modale
                if (newGroupModal) newGroupModal.classList.remove('active');
                const targetLink = document.querySelector('.nav-item[data-target="tab-groups"]');
                if (targetLink) targetLink.click();
            } else {
                const errorData = await response.json();
                window.showNotification(errorData.error, true);
            }
        } catch (error) {
            console.error(error);
            window.showNotification('Errore di connessione', true);
        }
    });

    // ==========================================
    // RECUPERO E RENDER GRUPPI E SALDI
    // ==========================================
    async function fetchUserGroups(userId) {
        try {
            const response = await fetch(`/api/groups/user/${userId}`);
            if (!response.ok) throw new Error('Errore gruppi');
            const groups = await response.json();
            renderGroups(groups);
        } catch (error) {
            console.error(error);
        }
    }

    async function fetchUserBalances(userId) {
        try {
            const loading = document.getElementById('balances-loading');
            const content = document.getElementById('balances-content');
            
            const response = await fetch(`/api/users/${userId}/balances`);
            if (!response.ok) throw new Error('Errore saldi');
            const data = await response.json();
            
            // Salva i dati dei saldi per la modale Settle Up
            lastBalancesData = data;

            // Calcola il bilancio netto
            const netBalance = data.totalCredit - data.totalOwed;
            const formattedNetBalance = `${netBalance >= 0 ? '+' : ''}€${netBalance.toFixed(2)}`;

            const netBalanceEl = document.getElementById('net-balance-value');
            if (netBalanceEl) {
                netBalanceEl.textContent = formattedNetBalance;
                netBalanceEl.className = `net-balance-amount ${netBalance >= 0 ? 'amount-positive' : 'amount-negative'}`;
            }

            const mobileNetBalanceEl = document.getElementById('mobile-net-balance-value');
            if (mobileNetBalanceEl) {
                mobileNetBalanceEl.textContent = formattedNetBalance;
                mobileNetBalanceEl.className = `net-balance-amount ${netBalance >= 0 ? 'amount-positive' : 'amount-negative'}`;
            }

            const totalOwedEl = document.getElementById('total-owed');
            if (totalOwedEl) totalOwedEl.innerHTML = `&euro;${data.totalOwed.toFixed(2)}`;
            
            const totalCreditEl = document.getElementById('total-credit');
            if (totalCreditEl) totalCreditEl.innerHTML = `&euro;${data.totalCredit.toFixed(2)}`;
            
            const mobileTotalOwed = document.getElementById('mobile-total-owed');
            if (mobileTotalOwed) mobileTotalOwed.innerHTML = `&euro;${data.totalOwed.toFixed(2)}`;
            const mobileTotalCredit = document.getElementById('mobile-total-credit');
            if (mobileTotalCredit) mobileTotalCredit.innerHTML = `&euro;${data.totalCredit.toFixed(2)}`;
            
            const detailsDiv = document.getElementById('balances-details');
            const mobileDetailsDiv = document.getElementById('mobile-balances-details');
            if (detailsDiv) detailsDiv.innerHTML = '';
            if (mobileDetailsDiv) mobileDetailsDiv.innerHTML = '';

            if (data.details.length === 0) {
                const emptyHTML = `<div class="empty-state" style="padding: 1rem;"><p>Nessun debito pendente. Sei in pari!</p></div>`;
                if (detailsDiv) detailsDiv.innerHTML = emptyHTML;
                if (mobileDetailsDiv) mobileDetailsDiv.innerHTML = emptyHTML;
            } else {
                data.details.forEach(d => {
                    // DESKTOP CARD
                    const item = document.createElement('div');
                    item.className = 'expense-item';
                    item.innerHTML = `
                        <strong style="font-size: 1.1rem; color: var(--text-main);">${d.groupName}</strong>
                        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; align-items: center;">
                            <div>
                                <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Da pagare:</span>
                                <span class="amount-negative">&euro;${d.owed.toFixed(2)}</span>
                            </div>
                            <div style="text-align: right;">
                                <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Da ricevere:</span>
                                <span class="amount-positive">&euro;${d.credit.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                    if (detailsDiv) detailsDiv.appendChild(item);

                    // MOBILE EDGE-TO-EDGE ROW
                    const mItem = document.createElement('div');
                    mItem.className = 'edge-row';
                    mItem.innerHTML = `
                        <div class="edge-row-left">
                            <div class="edge-avatar" style="background: var(--primary-color);">${d.groupName.charAt(0).toUpperCase()}</div>
                            <div class="edge-info">
                                <span class="edge-title">${d.groupName}</span>
                            </div>
                        </div>
                        <div class="edge-row-right">
                            <div class="edge-amounts">
                                ${d.owed > 0 ? `<span class="amount-negative">-${d.owed.toFixed(2)}€</span>` : ''}
                                ${d.credit > 0 ? `<span class="amount-positive">+${d.credit.toFixed(2)}€</span>` : ''}
                            </div>
                        </div>
                    `;
                    if (mobileDetailsDiv) mobileDetailsDiv.appendChild(mItem);
                });
            }

            loading.style.display = 'none';
            content.style.display = 'block';

        } catch (error) {
            console.error(error);
            document.getElementById('balances-loading').textContent = 'Ricarica pagina per calcolare i saldi.';
        }
    }

    function getAvatarHtml(nome, cognome) {
        const init = (nome.charAt(0) + (cognome ? cognome.charAt(0) : '')).toUpperCase();
        const colors = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#475569', '#64748b', '#4f46e5', '#4338ca', '#0284c7', '#0369a1', '#0f172a'];
        const num = Array.from(nome + cognome).reduce((a, b) => a + b.charCodeAt(0), 0);
        const bg = colors[num % colors.length];
        return `<span class="avatar" style="background:${bg}; margin-right: 0;">${init}</span>`;
    }

    function getGroupGradient(name) {
        const gradients = [
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
            'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
        ];
        const num = Array.from(name).reduce((a, b) => a + b.charCodeAt(0), 0);
        return gradients[num % gradients.length];
    }

    function renderGroups(groups) {
        if (groupsListContainer) groupsListContainer.innerHTML = '';
        const mobileGroupsList = document.getElementById('mobile-groups-list');
        if (mobileGroupsList) mobileGroupsList.innerHTML = '';

        if (!groups || groups.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.style.gridColumn = '1 / -1';
            emptyState.innerHTML = `<p>Nessun gruppo trovato.</p>`;
            
            if (groupsListContainer) {
                groupsListContainer.appendChild(emptyState.cloneNode(true));
            }
            if (mobileGroupsList) {
                mobileGroupsList.appendChild(emptyState.cloneNode(true));
            }
            return;
        }

        groups.forEach(group => {
            const isAdmin = group.adminId === user.id;
            const badgeHTML = isAdmin ? `<span style="background: rgba(0,0,0,0.4); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; backdrop-filter: blur(4px); height: fit-content;">Admin</span>` : '<div></div>';

            const membersCount = group.members ? group.members.length : 0;
            let avatarsHTML = '';
            if (group.members) {
                const displayMembers = group.members.slice(0, 4);
                displayMembers.forEach(m => {
                    avatarsHTML += getAvatarHtml(m.nome, m.cognome);
                });
                if (membersCount > 4) {
                    avatarsHTML += `<span class="avatar" style="background: var(--secondary-color); font-size: 0.65rem; margin-right: 0;">+${membersCount - 4}</span>`;
                }
            }

            // DESKTOP CARD GLASSMORPHIC
            const card = document.createElement('div');
            card.className = 'group-card';
            card.innerHTML = `
                <div class="group-card-cover" style="background: ${getGroupGradient(group.name)};">
                    <div class="group-card-icon">${group.name.charAt(0).toUpperCase()}</div>
                    ${badgeHTML}
                </div>
                <div class="group-card-content">
                    <h3 class="group-card-title">${group.name}</h3>
                    <div class="group-card-meta">
                        <div class="avatar-stack">
                            ${avatarsHTML}
                        </div>
                        <span class="members-count">${membersCount} ${membersCount === 1 ? 'Membro' : 'Membri'}</span>
                    </div>
                    <div class="group-card-actions">
                        <a href="group.html?id=${group.id}" class="btn btn-soft" style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                            Apri Gruppo
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </a>
                    </div>
                </div>
            `;
            if (groupsListContainer) groupsListContainer.appendChild(card);

            // MOBILE EDGE-TO-EDGE ROW
            const mRow = document.createElement('a');
            mRow.href = `group.html?id=${group.id}`;
            mRow.className = 'edge-row';
            mRow.style.textDecoration = 'none';
            mRow.style.color = 'inherit';
            mRow.innerHTML = `
                <div class="edge-row-left">
                    <div class="edge-avatar" style="background: var(--secondary-color);">${group.name.charAt(0).toUpperCase()}</div>
                    <div class="edge-info">
                        <span class="edge-title">${group.name}</span>
                        <span class="edge-subtitle">${group.members ? group.members.length : 0} Membri ${isAdmin ? '• Admin' : ''}</span>
                    </div>
                </div>
                <div class="edge-row-right">
                    <span style="color: var(--text-muted);">›</span>
                </div>
            `;
            if (mobileGroupsList) mobileGroupsList.appendChild(mRow);
        });
    }

    // ==========================================
    // RECUPERO E RENDER SPESE RECENTI (GLOBAL)
    // ==========================================
    async function fetchRecentExpenses(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/expenses`);
            if (!response.ok) throw new Error('Errore recupero spese recenti');
            const expenses = await response.json();
            renderRecentExpenses(expenses);
        } catch (error) {
            console.error(error);
        }
    }

    function renderRecentExpenses(expenses) {
        const desktopList = document.getElementById('recent-expenses-list');
        const mobileList = document.getElementById('mobile-recent-expenses-list');

        if (desktopList) desktopList.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';

        if (!expenses || expenses.length === 0) {
            const emptyHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nessuna spesa recente registrata.</td></tr>`;
            const emptyMobileHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">Nessuna spesa recente.</div>`;
            if (desktopList) desktopList.innerHTML = emptyHTML;
            if (mobileList) mobileList.innerHTML = emptyMobileHTML;
            return;
        }

        expenses.forEach(e => {
            // Desktop table row
            if (desktopList) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="expense-row-info">
                            <div class="expense-row-icon">
                                <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            </div>
                            <div>
                                <strong>${e.description}</strong>
                                <span class="expense-row-payer">Pagata da: ${e.payerName}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge-group">${e.groupName}</span></td>
                    <td><strong class="amount-negative">€${e.amount.toFixed(2)}</strong></td>
                `;
                desktopList.appendChild(tr);
            }

            // Mobile row
            if (mobileList) {
                const div = document.createElement('div');
                div.className = 'expense-item';
                div.style.margin = '0';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <div class="expense-row-icon" style="width: 28px; height: 28px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center;">
                                <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            </div>
                            <div>
                                <strong style="font-size: 0.9rem; color: var(--text-main); display: block;">${e.description}</strong>
                                <small style="color: var(--text-muted); font-size: 0.75rem;">${e.groupName} • ${e.payerName}</small>
                            </div>
                        </div>
                        <strong class="amount-negative" style="font-size: 0.95rem;">€${e.amount.toFixed(2)}</strong>
                    </div>
                `;
                mobileList.appendChild(div);
            }
        });
    }

    // ==========================================
    // MODALE SETTLE UP
    // ==========================================
    const settleUpModal = document.getElementById('settle-up-modal');
    const closeSettleModal = document.getElementById('close-settle-modal');
    const settleUpCta = document.getElementById('settle-up-cta');
    const mobileSettleUpCta = document.getElementById('mobile-settle-up-cta');
    const settleUpGroupsList = document.getElementById('settle-up-groups-list');

    function openSettleUpModal(balancesData) {
        if (!settleUpGroupsList) return;
        settleUpGroupsList.innerHTML = '';

        // Filtra i gruppi in cui l'utente ha un debito attivo (owed > 0)
        const debtDetails = balancesData.details.filter(d => d.owed > 0);

        if (debtDetails.length === 0) {
            settleUpGroupsList.innerHTML = `
                <div class="empty-state" style="padding: 1.5rem; gap: 0.5rem; border: none;">
                    <p style="font-size: 0.95rem;">Nessun debito attivo da saldare nei tuoi gruppi! Sei in pari.</p>
                </div>
            `;
        } else {
            debtDetails.forEach(d => {
                const item = document.createElement('div');
                item.className = 'settle-group-item';
                item.innerHTML = `
                    <div class="group-details">
                        <span class="group-name">${d.groupName}</span>
                        <span class="debt-value amount-negative">Debito: €${d.owed.toFixed(2)}</span>
                    </div>
                    <a href="group.html?id=${d.groupId}" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem;">Saldare</a>
                `;
                settleUpGroupsList.appendChild(item);
            });
        }

        if (settleUpModal) settleUpModal.classList.add('active');
    }

    if (settleUpCta) {
        settleUpCta.addEventListener('click', () => {
            openSettleUpModal(lastBalancesData);
        });
    }
    if (mobileSettleUpCta) {
        mobileSettleUpCta.addEventListener('click', () => {
            openSettleUpModal(lastBalancesData);
        });
    }
    if (closeSettleModal) {
        closeSettleModal.addEventListener('click', () => {
            settleUpModal.classList.remove('active');
        });
    }

    // ==========================================
    // LOGOUT
    // ==========================================
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
