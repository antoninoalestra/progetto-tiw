// auth.js - Gestisce la logica del form di login e registrazione

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const errorMsgDiv = document.getElementById('errorMsg');

  /**
   * Mostra un messaggio di errore nell'interfaccia.
   * @param {string} message - Il messaggio da visualizzare.
   */
  const showError = (message) => {
    errorMsgDiv.textContent = message;
    errorMsgDiv.style.display = 'block';
  };

  /**
   * Nasconde il messaggio di errore.
   */
  const hideError = () => {
    errorMsgDiv.style.display = 'none';
  };

  // Gestione del form di registrazione
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const nome = document.getElementById('nome').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/users/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nome, email, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Se la registrazione ha successo, reindirizza al login
          window.location.href = '/html/login.html';
        } else {
          // Mostra l'errore proveniente dal backend
          showError(data.error || 'Errore durante la registrazione.');
        }
      } catch (error) {
        showError('Errore di rete o del server.');
      }
    });
  }

  // Gestione del form di login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/users/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Salva token e dati utente nel localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          // Reindirizza alla dashboard
          window.location.href = '/html/dashboard.html';
        } else {
          showError(data.error || 'Errore durante il login.');
        }
      } catch (error) {
        showError('Errore di rete o del server.');
      }
    });
  }
});
