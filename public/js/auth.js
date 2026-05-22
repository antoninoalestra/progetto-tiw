// auth.js - Gestisce la logica del form di login e registrazione
import { showToast } from './ui/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const errorMsgDiv = document.getElementById('errorMsg');

  // Gestione del form di registrazione
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('nome').value.trim();
      const cognome = document.getElementById('cognome').value.trim();
      const email = document.getElementById('email').value.trim();
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
          showToast('Registrazione completata! Puoi ora accedere.', 'success');
          setTimeout(() => {
            window.location.href = '/html/login.html';
          }, 1500);
        } else {
          showToast(data.error || 'Errore durante la registrazione.', 'error');
        }
      } catch (error) {
        console.error(error);
        showToast('Errore di rete o del server.', 'error');
      }
    });
  }

  // Gestione del form di login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
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
          showToast('Accesso effettuato con successo!', 'success');
          setTimeout(() => {
            window.location.href = '/html/dashboard.html';
          }, 1000);
        } else {
          showToast(data.error || 'Errore durante il login.', 'error');
        }
      } catch (error) {
        console.error(error);
        showToast('Errore di rete o del server.', 'error');
      }
    });
  }
});
