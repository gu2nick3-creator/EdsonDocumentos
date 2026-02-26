import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { createPoolFromEnv } from "./db/pool.js";
import { initDb } from "./db/init.js";
import { authRouter } from "./routes/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { categoriesRouter } from "./routes/categories.js";
import { dashboardRouter } from "./routes/dashboard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const uploadsDir = path.resolve(ROOT, process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

async function ensureFirstAdmin(pool) {
  const [countRows] = await pool.query("SELECT COUNT(*) AS c FROM users");
  const c = Array.isArray(countRows) ? Number(countRows[0]?.c || 0) : 0;
  if (c > 0) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.warn(
      "[EFN API] Nenhum usuário encontrado. Defina ADMIN_USERNAME e ADMIN_PASSWORD (ou use POST /api/auth/bootstrap)."
    );
    return;
  }

  const hash = await bcrypt.hash(String(password), 12);
  await pool.query("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", [
    uuidv4(),
    String(username),
    hash,
  ]);

  console.log(`[EFN API] Usuário admin criado: ${username}`);
}

async function main() {
  const app = express();

  // --- CORS ---
  const allowedOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: allowedOrigin ? allowedOrigin.split(",").map((s) => s.trim()) : true,
      credentials: true,
    })
  );

  // --- Body parsers ---
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // --- DB ---
  const pool = createPoolFromEnv();
  await initDb(pool);
  await ensureFirstAdmin(pool);

  // --- API ---
  const api = express.Router();

  api.get("/health", (_req, res) => res.json({ ok: true }));
  api.use("/auth", authRouter(pool));
  api.use("/documents", documentsRouter(pool, uploadsDir));
  api.use("/categories", categoriesRouter(pool));
  api.use("/dashboard", dashboardRouter(pool));

  app.use("/api", api);

  // --- Frontend (Vite build) ---
  const distDir = path.join(ROOT, "dist");
  const indexHtml = path.join(distDir, "index.html");

  if (fs.existsSync(distDir) && fs.existsSync(indexHtml)) {
    app.use(express.static(distDir));

    // SPA fallback (exceto /api)
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(indexHtml);
    });
  } else {
    app.get("/", (_req, res) => {
      res
        .status(200)
        .send(
          "EFN API rodando. Para servir o site, execute 'npm run build' e reinicie a aplicação."
        );
    });
  }

  // --- Error handler ---
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`[EFN] Server online na porta ${port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
