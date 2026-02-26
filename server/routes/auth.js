import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth.js";

export function authRouter(pool) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username e password são obrigatórios" });
    }

    const [rows] = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(String(password), String(user.password_hash));
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "JWT_SECRET não configurado" });

    const token = jwt.sign({ id: user.id, username: user.username }, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.json({ token, user: { id: user.id, username: user.username } });
  });

  router.post("/logout", requireAuth, async (_req, res) => {
    // JWT não precisa de logout no servidor.
    return res.json({ ok: true });
  });

  router.post("/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "currentPassword e newPassword são obrigatórios" });
    }

    const userId = req.user.id;
    const [rows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

    const ok = await bcrypt.compare(String(currentPassword), String(user.password_hash));
    if (!ok) return res.status(401).json({ error: "Senha atual incorreta" });

    const newHash = await bcrypt.hash(String(newPassword), 12);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);

    return res.json({ ok: true });
  });

  // Endpoint opcional: cria o primeiro usuário admin se ainda não existir.
  // Use somente uma vez. Se já existir usuário, bloqueia.
  router.post("/bootstrap", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username e password são obrigatórios" });
    }

    const [countRows] = await pool.query("SELECT COUNT(*) AS c FROM users");
    const c = Array.isArray(countRows) ? Number(countRows[0]?.c || 0) : 0;
    if (c > 0) return res.status(409).json({ error: "Bootstrap já realizado" });

    const hash = await bcrypt.hash(String(password), 12);
    const id = uuidv4();
    await pool.query("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", [
      id,
      username,
      hash,
    ]);

    return res.status(201).json({ ok: true });
  });

  return router;
}
