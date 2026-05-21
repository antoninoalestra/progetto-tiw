/**
 * utils.js
 * Funzioni di utilità globale per il frontend, inclusa la gestione del logout globale e notifiche Toast.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inietta il contenitore per i Toast se non esiste
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Gestione Logout Globale
    // Seleziona qualsiasi bottone di logout (id o classe) presente nel DOM
    const logoutButtons = document.querySelectorAll('#logout-btn, #top-logout-btn, .logout-action');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Rimuove i dati dell'utente dalla sessione locale e reindirizza al login
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    });
});

