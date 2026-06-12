// Middleware per la gestione dei messaggi temporanei (flash messages).
// Trasferisce i messaggi di notifica dalla sessione alle variabili locali della risposta (res.locals),
// rimuovendoli contestualmente dalla sessione per assicurarne un utilizzo monouso.
export function flashMiddleware(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}
