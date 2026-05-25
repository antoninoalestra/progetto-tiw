// src/middleware/flash.js
// Middleware per i messaggi flash: sposta il messaggio dalla sessione
// a res.locals in modo che sia disponibile nelle viste Handlebars
// per una sola richiesta (one-time display).

/**
 * flashMiddleware: legge req.session.flash, lo copia in res.locals.flash
 * e lo elimina dalla sessione. Così il messaggio appare una sola volta.
 */
export function flashMiddleware(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}
