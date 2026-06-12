// Funzioni di supporto globali, usate in tutte le pagine

document.addEventListener('DOMContentLoaded', () => {
    // Prepara il contenitore per i messaggini a comparsa (toast) se manca
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Associa il logout a tutti i pulsanti pertinenti nello schermo
    const logoutButtons = document.querySelectorAll('#logout-btn, #top-logout-btn, .logout-action');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Pulisce i dati nel browser prima di tornare al login
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    });
});

