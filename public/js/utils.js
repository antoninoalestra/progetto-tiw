/**
 * utils.js
 * Funzioni di utilità globale per il frontend, incluse le notifiche Toast.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inietta il contenitore per i Toast se non esiste
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
});

/**
 * Mostra un banner di notifica Toast in basso a destra.
 * @param {string} message - Il messaggio da visualizzare.
 * @param {boolean} isError - Se true, il toast è rosso (errore), altrimenti verde (successo/info).
 */
window.showNotification = function(message, isError = false) {
    let toastContainer = document.getElementById('toast-container');

    // Fallback se chiamato prima che il DOMContentLoaded abbia creato il container
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Animazione di comparsa (gestita dal CSS, aggiungiamo una classe 'show' con un timeout minimo per il reflow)
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Rimuove il toast dopo 4 secondi
    setTimeout(() => {
        toast.classList.remove('show');
        // Aspetta la fine della transizione CSS per rimuovere l'elemento dal DOM
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 300); // 300ms corrisponde alla durata della transizione in CSS
    }, 4000);
};
