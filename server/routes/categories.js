import express from "express";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth.js";

export function categoriesRouter(pool) {
  const router = express.Router();

  // GET /categories
  router.get("/", async (_req, res) => {
    const [rows] = await pool.query(
      `
      SELECT c.id, c.name, COUNT(d.id) AS documentCount
      FROM categories c
      LEFT JOIN documents d ON d.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
      `
    );

    const list = Array.isArray(rows)
      ? rows.map((r) => ({
          id: r.id,
          name: r.name,
          documentCount: Number(r.documentCount || 0),
        }))
      : [];

    return res.json(list);
  });

  // POST /categories
  router.post("/", requireAuth, async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: "name é obrigatório" });

    const id = uuidv4();
    try {
      await pool.query("INSERT INTO categories (id, name) VALUES (?, ?)", [id, String(name)]);
      return res.status(201).json({ id, name: String(name) });
    } catch (e) {
      // nome duplicado
      return res.status(409).json({ error: "Categoria já existe" });
    }
  });

  // PUT /categories/:id
  router.put("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: "name é obrigatório" });

    const [result] = await pool.query("UPDATE categories SET name = ? WHERE id = ?", [
      String(name),
      id,
    ]);

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    return res.json({ id, name: String(name) });
  });

  // DELETE /categories/:id
  router.delete("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    const [countRows] = await pool.query("SELECT COUNT(*) AS c FROM documents WHERE category_id = ?", [
      id,
    ]);
    const c = Array.isArray(countRows) ? Number(countRows[0]?.c || 0) : 0;

    if (c > 0) {
      return res
        .status(409)
        .json({ error: "Não é possível remover: existem documentos nessa categoria" });
    }

    const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [id]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    return res.json({ ok: true });
  });

  return router;
}
