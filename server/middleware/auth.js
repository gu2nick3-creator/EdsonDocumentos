import jwt from "jsonwebtoken";

export function maybeAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET não configurado");
    req.user = jwt.verify(token, secret);
  } catch {
    // token inválido = sem usuário
    req.user = undefined;
  }

  next();
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET não configurado");
    req.user = jwt.verify(token, secret);
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function isAdmin(req) {
  // Neste projeto, todo usuário autenticado é admin.
  return Boolean(req.user?.id);
}
