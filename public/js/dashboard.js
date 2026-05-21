/**
 * dashboard.js
 * Gestisce la logica della dashboard con la nuova UI.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica autenticazione
    const userString = localStorage.getItem('user');
    if (!userString) {
        window.location.href = 'login.html';
        return;
    }

    let user = JSON.parse(userString);
    let lastBalancesData = { totalOwed: 0, totalCredit: 0, details: [] };
    
    // UI Elements generici
    const welcomeText = document.getElementById('welcome-text');
    if (welcomeText) welcomeText.textContent = user.nome;

    const profileAvatarLetters = document.querySelectorAll('#profile-avatar-letter, #top-profile-avatar-letter');
    profileAvatarLetters.forEach(el => el.textContent = user.nome.charAt(0).toUpperCase());

    // Profile Fields
    const profileForm = document.getElementById('profile-form');
    const profileName = document.getElementById('profile-name');
    const profileCognome = document.getElementById('profile-cognome');
    const profileEmail = document.getElementById('profile-email');
    const profilePassword = document.getElementById('profile-password');

    if (profileName) profileName.value = user.nome;
    if (profileCognome) profileCognome.value = user.cognome || '';
    if (profileEmail) profileEmail.value = user.email;

    // Inizializzazione Dati
    initData();

    async function initData() {
        showSkeletons();
        await Promise.all([
            fetchUserGroups(user.id),
            fetchUserBalances(user.id),
            fetchRecentExpenses(user.id)
        ]);
    }

    function showSkeletons() {
        const groupsList = document.getElementById('groups-list');
        const recentExpensesList = document.getElementById('recent-expenses-list');
        const balancesDetails = document.getElementById('balances-details');

        if (groupsList && window.createGridSkeleton) groupsList.innerHTML = window.createGridSkeleton(4);
        if (recentExpensesList && window.createListSkeleton) recentExpensesList.innerHTML = window.createListSkeleton(3);
        if (balancesDetails && window.createListSkeleton) balancesDetails.innerHTML = window.createListSkeleton(2);
    }

    // ==========================================
    // NAVIGAZIONE
    // ==========================================
    const navLinks = document.querySelectorAll('[data-target]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (!targetId) return;

            // Update Active state for nav
            document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.bnav-link').forEach(n => n.classList.remove('active'));
            
            // Add active to matching links
            document.querySelectorAll(`[data-target="${targetId}"]`).forEach(n => {
                if (n.classList.contains('nav-link') || n.classList.contains('bnav-link')) {
                    n.classList.add('active');
                }
            });

            // Show Tab Content
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
                tab.classList.remove('active');
            });
            const targetTab = document.getElementById(targetId);
            if (targetTab) {
                targetTab.style.display = 'block';
                targetTab.classList.add('active');
            }
            
            if (targetId === 'tab-home' || targetId === 'tab-groups') {
                initData(); 
            }
        });
    });

    // ==========================================
    // MODALI NUOVO GRUPPO
    // ==========================================
    const newGroupModal = document.getElementById('new-group-modal');
    const closeNewGroupModal = document.getElementById('close-new-group-modal');

    document.querySelectorAll('#nav-btn-nuovo, #alt-nuovo-gruppo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (newGroupModal) newGroupModal.classList.add('active');
        });
    });

    if (closeNewGroupModal) {
        closeNewGroupModal.addEventListener('click', () => {
            newGroupModal.classList.remove('active');
        });
    }

    // ==========================================
    // PROFILO
    // ==========================================
    if (profileForm) {
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
                    profileAvatarLetters.forEach(el => el.textContent = user.nome.charAt(0).toUpperCase());
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
    }

    // ==========================================
    // CREAZIONE / UNIONE GRUPPI
    // ==========================================
    const createGroupForm = document.getElementById('create-group-form');
    const joinGroupForm = document.getElementById('join-group-form');

    if (createGroupForm) {
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
                    if (newGroupModal) newGroupModal.classList.remove('active');
                    document.querySelector('[data-target="tab-groups"]')?.click();
                } else {
                    const errorData = await response.json();
                    window.showNotification(errorData.error, true);
                }
            } catch (error) {
                console.error(error);
                window.showNotification('Errore di connessione', true);
            }
        });
    }

    if (joinGroupForm) {
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
                    if (newGroupModal) newGroupModal.classList.remove('active');
                    document.querySelector('[data-target="tab-groups"]')?.click();
                } else {
                    const errorData = await response.json();
                    window.showNotification(errorData.error, true);
                }
            } catch (error) {
                console.error(error);
                window.showNotification('Errore di connessione', true);
            }
        });
    }

    // ==========================================
    // FETCH DATA LOGIC
    // ==========================================
    async function fetchUserGroups(userId) {
        try {
            const response = await fetch(`/api/groups/user/${userId}`);
            if (!response.ok) throw new Error('Errore gruppi');
            const groups = await response.json();
            
            // Update Stats
            const statActiveGroups = document.getElementById('stat-active-groups');
            if (statActiveGroups) statActiveGroups.textContent = groups.length;

            renderGroups(groups);
        } catch (error) {
            console.error(error);
        }
    }

    async function fetchUserBalances(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/balances`);
            if (!response.ok) throw new Error('Errore saldi');
            const data = await response.json();
            lastBalancesData = data;

            // Hero Bilancio
            const netBalance = data.totalCredit - data.totalOwed;
            const netBalanceEl = document.getElementById('net-balance-value');
            if (netBalanceEl) netBalanceEl.textContent = `€${netBalance.toFixed(2)}`;
            
            const totalOwedEl = document.getElementById('total-owed');
            if (totalOwedEl) totalOwedEl.textContent = `€${data.totalOwed.toFixed(2)}`;
            
            const totalCreditEl = document.getElementById('total-credit');
            if (totalCreditEl) totalCreditEl.textContent = `€${data.totalCredit.toFixed(2)}`;

            // Stats
            const statMyShare = document.getElementById('stat-my-share');
            if (statMyShare) statMyShare.textContent = `€${data.totalOwed.toFixed(2)}`;

            renderBalances(data);
        } catch (error) {
            console.error(error);
        }
    }

    async function fetchRecentExpenses(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/expenses`);
            if (!response.ok) throw new Error('Errore recupero spese');
            const expenses = await response.json();
            
            // Calc total expenses
            let total = 0;
            expenses.forEach(e => total += e.amount);
            const statTotalExp = document.getElementById('stat-total-expenses');
            if (statTotalExp) statTotalExp.textContent = `€${total.toFixed(2)}`;

            renderRecentExpenses(expenses);
        } catch (error) {
            console.error(error);
        }
    }

    // ==========================================
    // RENDER LOGIC
    // ==========================================
    function getAvatarHtml(nome, cognome) {
        const init = (nome.charAt(0) + (cognome ? cognome.charAt(0) : '')).toUpperCase();
        return `<span class="avatar avatar-sm" style="background: var(--color-brand-400);">${init}</span>`;
    }

    function renderGroups(groups) {
        const groupsListContainer = document.getElementById('groups-list');
        if (!groupsListContainer) return;
        groupsListContainer.innerHTML = '';

        if (!groups || groups.length === 0) {
            groupsListContainer.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                <p>Nessun gruppo trovato. Creane uno per iniziare!</p>
            </div>`;
            return;
        }

        groups.forEach(group => {
            const membersCount = group.members ? group.members.length : 0;
            let avatarsHTML = '';
            if (group.members) {
                group.members.slice(0, 4).forEach(m => avatarsHTML += getAvatarHtml(m.nome, m.cognome));
                if (membersCount > 4) avatarsHTML += `<span class="avatar avatar-sm" style="background: var(--color-neutral-500);">+${membersCount - 4}</span>`;
            }

            const card = document.createElement('div');
            card.className = 'card card-hover';
            card.style.height = '100%';
            card.innerHTML = `
                <div class="group-card-header" style="background: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700));">
                    <div class="avatar" style="background: rgba(255,255,255,0.2); width: 40px; height: 40px;">${group.name.charAt(0).toUpperCase()}</div>
                    ${group.adminId === user.id ? '<span class="badge" style="background: rgba(0,0,0,0.3); color: white;">Admin</span>' : ''}
                </div>
                <div class="group-card-body">
                    <div class="group-name-row">
                        <h3>${group.name}</h3>
                    </div>
                    <div class="group-meta">
                        <span>${membersCount} Membr${membersCount === 1 ? 'o' : 'i'}</span>
                        <div class="avatar-stack">${avatarsHTML}</div>
                    </div>
                    <div class="group-footer">
                        <a href="group.html?id=${group.id}" class="btn btn-secondary" style="width: 100%;">Apri Gruppo</a>
                    </div>
                </div>
            `;
            groupsListContainer.appendChild(card);
        });
    }

    function renderRecentExpenses(expenses) {
        const list = document.getElementById('recent-expenses-list');
        if (!list) return;
        list.innerHTML = '';

        if (!expenses || expenses.length === 0) {
            list.innerHTML = `<div class="empty-state" style="padding: 24px;"><p>Nessuna spesa recente.</p></div>`;
            return;
        }

        expenses.slice(0, 10).forEach(e => {
            const div = document.createElement('div');
            div.className = 'feed-item';
            div.innerHTML = `
                <div class="feed-item-left">
                    <div class="feed-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></div>
                    <div class="feed-details">
                        <h4>${e.description}</h4>
                        <p>${e.groupName} • ${e.payerName}</p>
                    </div>
                </div>
                <div class="feed-amount">€${e.amount.toFixed(2)}</div>
            `;
            list.appendChild(div);
        });
    }

    function renderBalances(data) {
        const detailsDiv = document.getElementById('balances-details');
        const loading = document.getElementById('balances-loading');
        if (!detailsDiv) return;

        if (loading) loading.style.display = 'none';
        detailsDiv.innerHTML = '';

        if (data.details.length === 0) {
            detailsDiv.innerHTML = `<div class="empty-state" style="padding: 24px;"><p>Sei in pari in tutti i gruppi!</p></div>`;
            return;
        }

        data.details.forEach(d => {
            const div = document.createElement('div');
            div.className = 'feed-item';
            div.innerHTML = `
                <div class="feed-item-left">
                    <div class="feed-icon" style="background: var(--color-brand-100); color: var(--color-brand-600); font-weight: 600;">${d.groupName.charAt(0).toUpperCase()}</div>
                    <div class="feed-details">
                        <h4>${d.groupName}</h4>
                        <p>Il tuo bilancio</p>
                    </div>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; gap: 4px;">
                    ${d.owed > 0 ? `<span class="badge badge-danger">Dare €${d.owed.toFixed(2)}</span>` : ''}
                    ${d.credit > 0 ? `<span class="badge badge-success">Avere €${d.credit.toFixed(2)}</span>` : ''}
                </div>
            `;
            detailsDiv.appendChild(div);
        });
    }
});
