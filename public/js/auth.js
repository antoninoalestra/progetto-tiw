// auth.js - Gestisce la logica del form di login e registrazione

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const errorMsgDiv = document.getElementById('errorMsg');

  // Gestione del form di registrazione
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('nome').value;
      const cognome = document.getElementById('cognome').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/users/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nome, cognome, email, password })
        });

        const data = await response.json();

        if (response.ok) {
          showNotification('Registrazione completata! Puoi ora accedere.', false);
          setTimeout(() => {
            window.location.href = '/html/login.html';
          }, 1500);
        } else {
          showNotification(data.error || 'Errore durante la registrazione.', true);
        }
      } catch (error) {
        showNotification('Errore di rete o del server.', true);
      }
    });
  }

  // Gestione del form di login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

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
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          showNotification('Accesso effettuato con successo!', false);
          setTimeout(() => {
            window.location.href = '/html/dashboard.html';
          }, 1000);
        } else {
          showNotification(data.error || 'Errore durante il login.', true);
        }
      } catch (error) {
        showNotification('Errore di rete o del server.', true);
      }
    });
  }
});
