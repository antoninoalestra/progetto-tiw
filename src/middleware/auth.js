// Middleware per l'autorizzazione degli accessi.
// Verifica la presenza di un 'userId' valido nella sessione per proteggere le rotte riservate.
// In caso di assenza, genera un messaggio di errore e reindirizza l'utente alla pagina di login.
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.flash = { type: 'error', message: 'Devi accedere per continuare.' };
    return res.redirect('/login');
  }

  next();
}