// Sistema per mostrare i messaggini temporanei (Toast) in basso a destra
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Sceglie l'icona in base al tipo (successo o errore)
  const iconSvg = type === 'success' 
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <div style="font-weight: 500; color: var(--text-primary); font-size: 14px;">${message}</div>
    <div class="toast-progress" style="animation-duration: 4s;"></div>
  `;

  container.appendChild(toast);

  // Rimuove la notifica dopo 4 secondi
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s reverse forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// Mantiene la compatibilità col vecchio codice che chiamava showNotification
window.showNotification = function(message, isError = false) {
  showToast(message, isError ? 'error' : 'success');
};
