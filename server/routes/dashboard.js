import express from "express";
import { requireAuth } from "../middleware/auth.js";

export function dashboardRouter(pool) {
  const router = express.Router();

  router.get("/stats", requireAuth, async (_req, res) => {
    const [[tot]] = await pool.query("SELECT COUNT(*) AS c FROM documents");
    const [[pub]] = await pool.query("SELECT COUNT(*) AS c FROM documents WHERE is_public = 1");

    const [byCatRows] = await pool.query(
      `
      SELECT c.name AS name, COUNT(d.id) AS count
      FROM categories c
      LEFT JOIN documents d ON d.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
      `
    );

    const total = Number(tot?.c || 0);
    const publicCount = Number(pub?.c || 0);

    const byCategory = Array.isArray(byCatRows)
      ? byCatRows.map((r) => ({ name: r.name, count: Number(r.count || 0) }))
      : [];

    return res.json({
      total,
      public: publicCount,
      private: total - publicCount,
      byCategory,
    });
  });

  return router;
}
