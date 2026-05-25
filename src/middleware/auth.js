// src/middleware/auth.js
// Middleware di autenticazione: blocca l'accesso alle rotte protette
// se l'utente non ha una sessione attiva.

/**
 * requireAuth: verifica che req.session.userId sia impostato.
 * Se l'utente non è autenticato, mostra un flash di errore
 * e reindirizza alla pagina di login.
 */
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.flash = { type: 'error', message: 'Devi accedere per continuare.' };
    return res.redirect('/login');
  }
  next();
}
