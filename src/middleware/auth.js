// Protegge le rotte richiedendo il login
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.flash = { type: 'error', message: 'Devi accedere per continuare.' };
    return res.redirect('/login');
  }
  next();
}
