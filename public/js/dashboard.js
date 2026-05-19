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
    profileAvatarLetter.textContent = user.nome.charAt(0).toUpperCase();
    
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
    }

    // ==========================================
    // GESTIONE NAVIGAZIONE (BOTTOM NAV)
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');

            // Phase 3: "Nuovo" diventa Bottom Sheet overlay su Mobile
            if (targetId === 'tab-add' && window.innerWidth <= 640) {
                const addSheet = document.getElementById('tab-add');
                addSheet.classList.add('mobile-bottom-sheet-active');
                return; // Non cambiare i tab attivi sottostanti
            }

            // Rimuovi active da tutti i tab
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            // Aggiungi active al target
            item.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            
            // Seleziona aggiornamento dati dinamico
            if (targetId === 'tab-home' || targetId === 'tab-groups') {
                initData(); // Refresh rapido in background per avere dati sempre aggiornati
            }
        });
    });

    // Chiusura Bottom Sheet Mobile
    const closeAddSheetBtn = document.getElementById('close-add-sheet');
    if (closeAddSheetBtn) {
        closeAddSheetBtn.addEventListener('click', () => {
            document.getElementById('tab-add').classList.remove('mobile-bottom-sheet-active');
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
                profileAvatarLetter.textContent = user.nome.charAt(0).toUpperCase();
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
                
                // Torna al tab gruppi per vederlo
                document.querySelector('.nav-item[data-target="tab-groups"]').click();
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
                // Torna al tab gruppi
                document.querySelector('.nav-item[data-target="tab-groups"]').click();
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

            document.getElementById('total-owed').innerHTML = `&euro;${data.totalOwed.toFixed(2)}`;
            document.getElementById('total-credit').innerHTML = `&euro;${data.totalCredit.toFixed(2)}`;
            
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
                groupsListContainer.classList.remove('dashboard-grid');
                groupsListContainer.appendChild(emptyState.cloneNode(true));
            }
            if (mobileGroupsList) {
                mobileGroupsList.appendChild(emptyState.cloneNode(true));
            }
            return;
        }

        if (groupsListContainer) groupsListContainer.classList.add('dashboard-grid');

        groups.forEach(group => {
            const isAdmin = group.adminId === user.id;
            const badgeHTML = isAdmin ? `<span style="background: var(--warning-color); color: white; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; margin-left: 0.5rem; vertical-align: top;">Admin</span>` : '';

            // DESKTOP CARD
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3 style="font-size: 1.4rem; margin-bottom: 0.5rem; color: var(--text-main);">${group.name} ${badgeHTML}</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem;">
                    Membri: <strong style="color: var(--primary-color);">${group.members ? group.members.length : 0}</strong>
                </p>
                <a href="group.html?id=${group.id}" class="btn" style="width: 100%;">Entra nel Gruppo</a>
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
    // LOGOUT
    // ==========================================
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});
