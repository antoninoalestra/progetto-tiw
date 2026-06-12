// Espone i messaggi flash alla vista corrente e li ripulisce dalla sessione
export function flashMiddleware(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}
