import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { maybeAuth, requireAuth, isAdmin } from "../middleware/auth.js";

function formatFileSize(bytes) {
  const mb = bytes / (1024 * 1024);
  if (!Number.isFinite(mb)) return "—";
  if (mb < 1) return `${Math.max(0.1, mb).toFixed(1)} MB`;
  return `${mb.toFixed(1)} MB`;
}


function mimeFromExt(filename = "") {
  const ext = path.extname(filename || "").toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".csv":
      return "text/csv";
    case ".txt":
      return "text/plain";
    case ".zip":
      return "application/zip";
    case ".rar":
      return "application/vnd.rar";
    case ".7z":
      return "application/x-7z-compressed";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".dwg":
      return "image/vnd.dwg";
    case ".dxf":
      return "image/vnd.dxf";
    default:
      return null;
  }
}

function sniffMime(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(12);
    const bytes = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    const b = buf.slice(0, bytes);

    // PDF: %PDF-
    if (bytes >= 5 && b.slice(0, 5).toString("utf8") === "%PDF-") return "application/pdf";
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    // JPG: FF D8 FF
    if (bytes >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    // GIF: GIF8
    if (bytes >= 4 && b.slice(0, 4).toString("utf8") === "GIF8") return "image/gif";
    // ZIP: PK..
    if (bytes >= 2 && b[0] === 0x50 && b[1] === 0x4b) return "application/zip";

    return null;
  } catch {
    return null;
  }
}

function resolveMimeType(filePath, originalFilename, providedMime) {
  const p = String(providedMime || "").toLowerCase();
  if (p && p !== "application/octet-stream") return providedMime;

  const byExt = mimeFromExt(originalFilename) || mimeFromExt(filePath);
  if (byExt) return byExt;

  const sniffed = sniffMime(filePath);
  if (sniffed) return sniffed;

  return providedMime || "application/octet-stream";
}

function fileTypeFromMime(mime, originalFilename) {
  const ext = path.extname(originalFilename || "").replace(".", "").toLowerCase();

  const isImageExt = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext);
  const isSheetExt = ["xls", "xlsx", "csv", "ods"].includes(ext);
  const isDocExt = ["doc", "docx", "odt", "rtf"].includes(ext);
  const isZipExt = ["zip", "rar", "7z", "tar", "gz"].includes(ext);

  if (ext === "pdf") return "pdf";
  if (ext === "dwg" || ext === "dxf") return "dwg";
  if (isImageExt) return "image";
  if (isSheetExt) return "spreadsheet";
  if (isDocExt) return "doc";
  if (isZipExt) return "zip";

  if (!mime) return "other";
  if (mime.includes("pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("word")) return "doc";
  if (mime.includes("excel") || mime.includes("spreadsheet") || mime.includes("csv")) return "spreadsheet";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "zip";
  return "other";
}

async function ensureCategory(pool, categoryName) {
  if (!categoryName) return null;
  const name = String(categoryName).trim();
  if (!name) return null;

  const [rows] = await pool.query("SELECT id FROM categories WHERE name = ? LIMIT 1", [name]);
  const found = Array.isArray(rows) ? rows[0] : null;
  if (found?.id) return found.id;

  const id = uuidv4();
  await pool.query("INSERT INTO categories (id, name) VALUES (?, ?)", [id, name]);
  return id;
}

function mapDocRow(row) {
  let tags = [];
  try {
    if (Array.isArray(row.tags_json)) tags = row.tags_json;
    else if (row.tags_json && typeof row.tags_json === "object") tags = row.tags_json;
    else if (typeof row.tags_json === "string") tags = JSON.parse(row.tags_json);
  } catch {
    tags = [];
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category_name || null,
    description: row.description || "",
    tags,
    fileType: fileTypeFromMime(row.mime_type, row.original_filename || row.stored_filename),
    mimeType: row.mime_type || null,
    originalFilename: row.original_filename || null,
    fileSize: formatFileSize(Number(row.size_bytes || 0)),
    createdAt: new Date(row.created_at).toISOString().split("T")[0],
    isPublic: Boolean(row.is_public),
  };
}

export function documentsRouter(pool, uploadsDirAbs) {
  const router = express.Router();

  // Multer
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDirAbs),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024) },
  });

  // GET /documents
  router.get("/", maybeAuth, async (req, res) => {
    const publicOnly = String(req.query.public || "").toLowerCase() === "true";
    const admin = isAdmin(req);

    const where = publicOnly || !admin ? "WHERE d.is_public = 1" : "";

    const [rows] = await pool.query(
      `
      SELECT d.*, c.name AS category_name
      FROM documents d
      LEFT JOIN categories c ON c.id = d.category_id
      ${where}
      ORDER BY d.created_at DESC
      `
    );

    const list = Array.isArray(rows) ? rows.map(mapDocRow) : [];
    return res.json(list);
  });

  // GET /documents/:id
  router.get("/:id", maybeAuth, async (req, res) => {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT d.*, c.name AS category_name
      FROM documents d
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE d.id = ?
      LIMIT 1
      `,
      [id]
    );

    const doc = Array.isArray(rows) ? rows[0] : null;
    if (!doc) return res.status(404).json({ error: "Documento não encontrado" });

    if (!doc.is_public && !isAdmin(req)) {
      return res.status(403).json({ error: "Documento privado" });
    }

    return res.json(mapDocRow(doc));
  });

  // POST /documents (multipart)
  router.post("/", requireAuth, upload.single("file"), async (req, res) => {
    const { name, category, description, tags, isPublic } = req.body || {};

    if (!name) return res.status(400).json({ error: "name é obrigatório" });
    if (!req.file) return res.status(400).json({ error: "file é obrigatório" });

    let parsedTags = [];
    try {
      parsedTags = tags ? JSON.parse(String(tags)) : [];
    } catch {
      parsedTags = [];
    }

    const categoryId = await ensureCategory(pool, category);

    const id = uuidv4();
    const is_public = String(isPublic).toLowerCase() === "true" ? 1 : 0;
    const storedPath = path.join(uploadsDirAbs, req.file.filename);
    const resolvedMime = resolveMimeType(storedPath, req.file.originalname, req.file.mimetype);


    await pool.query(
      `
      INSERT INTO documents (
        id, name, category_id, description, tags_json,
        stored_filename, original_filename, mime_type, size_bytes, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        String(name),
        categoryId,
        description ? String(description) : "",
        JSON.stringify(parsedTags),
        req.file.filename,
        req.file.originalname,
        resolvedMime,
        req.file.size,
        is_public,
      ]
    );

    const [rows] = await pool.query(
      `
      SELECT d.*, c.name AS category_name
      FROM documents d
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE d.id = ?
      LIMIT 1
      `,
      [id]
    );

    const doc = Array.isArray(rows) ? rows[0] : null;
    return res.status(201).json(mapDocRow(doc));
  });

  // PUT /documents/:id
  router.put("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, category, description, tags } = req.body || {};

    const [existingRows] = await pool.query("SELECT id FROM documents WHERE id = ? LIMIT 1", [id]);
    if (!Array.isArray(existingRows) || !existingRows[0]) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    let categoryId = null;
    if (category !== undefined) categoryId = await ensureCategory(pool, category);

    let parsedTags = undefined;
    if (tags !== undefined) {
      parsedTags = Array.isArray(tags) ? tags : String(tags);
    }

    const sets = [];
    const vals = [];

    if (name !== undefined) {
      sets.push("name = ?");
      vals.push(String(name));
    }
    if (category !== undefined) {
      sets.push("category_id = ?");
      vals.push(categoryId);
    }
    if (description !== undefined) {
      sets.push("description = ?");
      vals.push(String(description));
    }
    if (tags !== undefined) {
      const json = Array.isArray(parsedTags)
        ? JSON.stringify(parsedTags)
        : (() => {
            try {
              return JSON.stringify(JSON.parse(String(parsedTags)));
            } catch {
              return JSON.stringify([]);
            }
          })();
      sets.push("tags_json = ?");
      vals.push(json);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "Nada para atualizar" });
    }

    vals.push(id);
    await pool.query(`UPDATE documents SET ${sets.join(", ")} WHERE id = ?`, vals);

    const [rows] = await pool.query(
      `
      SELECT d.*, c.name AS category_name
      FROM documents d
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE d.id = ?
      LIMIT 1
      `,
      [id]
    );

    const doc = Array.isArray(rows) ? rows[0] : null;
    return res.json(mapDocRow(doc));
  });

  // PATCH /documents/:id/visibility
  router.patch("/:id/visibility", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { isPublic } = req.body || {};
    const is_public = String(isPublic).toLowerCase() === "true" ? 1 : 0;

    const [result] = await pool.query("UPDATE documents SET is_public = ? WHERE id = ?", [
      is_public,
      id,
    ]);

    // mysql2 returns ResultSetHeader
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    return res.json({ ok: true });
  });

  // DELETE /documents/:id
  router.delete("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT stored_filename FROM documents WHERE id = ? LIMIT 1",
      [id]
    );

    const doc = Array.isArray(rows) ? rows[0] : null;
    if (!doc) return res.status(404).json({ error: "Documento não encontrado" });

    await pool.query("DELETE FROM documents WHERE id = ?", [id]);

    const filePath = path.join(uploadsDirAbs, doc.stored_filename);
    fs.promises.unlink(filePath).catch(() => {});

    return res.json({ ok: true });
  });

  // GET /documents/:id/download
  router.get("/:id/download", maybeAuth, async (req, res) => {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT stored_filename, original_filename, mime_type, is_public FROM documents WHERE id = ? LIMIT 1",
      [id]
    );

    const doc = Array.isArray(rows) ? rows[0] : null;
    if (!doc) return res.status(404).json({ error: "Documento não encontrado" });

    if (!doc.is_public && !isAdmin(req)) {
      return res.status(403).json({ error: "Documento privado" });
    }

    const filePath = path.join(uploadsDirAbs, doc.stored_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }

    const mime = resolveMimeType(filePath, doc.original_filename, doc.mime_type);
    if (mime) res.setHeader("Content-Type", mime);
    return res.download(filePath, doc.original_filename);
  });

  return router;
}
