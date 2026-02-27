/**
 * ============================================================
 * API SERVICE — Edson Fernando Documentos
 * ============================================================
 *
 * Camada de serviço para integração com API REST na Hostinger.
 *
 * 👉 COMO USAR:
 *   1. Crie a API REST na Hostinger (PHP, Node.js etc.)
 *   2. Altere API_BASE_URL abaixo para a URL da sua API
 *   3. Implemente os endpoints listados neste arquivo
 *
 * 👉 ENDPOINTS NECESSÁRIOS NA HOSTINGER:
 *
 *   POST   /auth/login          → { username, password } → { token }
 *   POST   /auth/logout         → Header: Authorization Bearer token
 *   POST   /auth/change-password → { currentPassword, newPassword }
 *
 *   GET    /documents           → lista documentos públicos (ou todos se admin)
 *   GET    /documents/:id       → detalhes de um documento
 *   POST   /documents           → cria documento (multipart: file + metadados)
 *   PUT    /documents/:id       → atualiza metadados
 *   PATCH  /documents/:id/visibility → { isPublic: boolean }
 *   DELETE /documents/:id       → remove documento + arquivo
 *   GET    /documents/:id/download → retorna arquivo para download
 *
 *   GET    /categories          → lista categorias
 *   POST   /categories          → { name } → cria categoria
 *   PUT    /categories/:id      → { name } → renomeia
 *   DELETE /categories/:id      → remove (verificar docs vinculados)
 *
 *   GET    /dashboard/stats     → { total, public, private, byCategory }
 *
 * ============================================================
 */

import { type DocumentItem, type DocumentCategory, mockDocuments, categories } from "@/lib/mock-data";

// ─── CONFIGURAÇÃO ──────────────────────────────────────────
// Base URL da API.
// ✅ Em produção (mesmo domínio), o recomendado é usar "/api".
// ✅ Se a API estiver em outro domínio, defina VITE_API_BASE_URL no .env.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Se true, usa dados mock locais (sem chamar a API)
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// ─── HELPERS ───────────────────────────────────────────────

function getToken(): string | null {
  return sessionStorage.getItem("efn-token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API Error [${res.status}]: ${body}`);
  }

  return res.json();
}

// ─── AUTH ──────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: { id: string; username: string };
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    if (USE_MOCK) {
      if (username === "edson" && password === "Edson2202@") {
        const mockToken = "mock-jwt-token";
        sessionStorage.setItem("efn-token", mockToken);
        sessionStorage.setItem("efn-admin", "true");
        return { token: mockToken, user: { id: "1", username: "edson" } };
      }
      throw new Error("Credenciais inválidas");
    }

    const data = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    sessionStorage.setItem("efn-token", data.token);
    sessionStorage.setItem("efn-admin", "true");
    return data;
  },

  async logout(): Promise<void> {
    if (!USE_MOCK) {
      await request("/auth/logout", { method: "POST" }).catch(() => {});
    }
    sessionStorage.removeItem("efn-token");
    sessionStorage.removeItem("efn-admin");
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (USE_MOCK) {
      return;
    }
    await request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  isAuthenticated(): boolean {
    return sessionStorage.getItem("efn-admin") === "true";
  },
};

// ─── DOCUMENTOS ────────────────────────────────────────────

export interface CreateDocumentPayload {
  name: string;
  category: DocumentCategory;
  description: string;
  tags: string[];
  isPublic: boolean;
  file?: File;
}

export interface UpdateDocumentPayload {
  name?: string;
  category?: DocumentCategory;
  description?: string;
  tags?: string[];
}

export const documentService = {
  async list(publicOnly = true): Promise<DocumentItem[]> {
    if (USE_MOCK) {
      return publicOnly ? mockDocuments.filter((d) => d.isPublic) : [...mockDocuments];
    }
    return request<DocumentItem[]>(`/documents${publicOnly ? "?public=true" : ""}`);
  },

  async getById(id: string): Promise<DocumentItem> {
    if (USE_MOCK) {
      const doc = mockDocuments.find((d) => d.id === id);
      if (!doc) throw new Error("Documento não encontrado");
      return doc;
    }
    return request<DocumentItem>(`/documents/${id}`);
  },

  async create(payload: CreateDocumentPayload): Promise<DocumentItem> {
    if (USE_MOCK) {
      const newDoc: DocumentItem = {
        id: Date.now().toString(),
        name: payload.name,
        category: payload.category,
        description: payload.description,
        tags: payload.tags,
        fileType: "pdf",
        fileSize: payload.file ? `${(payload.file.size / (1024 * 1024)).toFixed(1)} MB` : "—",
        createdAt: new Date().toISOString().split("T")[0],
        isPublic: payload.isPublic,
      };
      return newDoc;
    }

    // Multipart upload
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("category", payload.category);
    formData.append("description", payload.description);
    formData.append("tags", JSON.stringify(payload.tags));
    formData.append("isPublic", String(payload.isPublic));
    if (payload.file) {
      formData.append("file", payload.file);
    }

    const res = await fetch(`${API_BASE_URL}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken() || ""}` },
      body: formData,
    });

    if (!res.ok) throw new Error(`Upload failed [${res.status}]`);
    return res.json();
  },

  async update(id: string, payload: UpdateDocumentPayload): Promise<DocumentItem> {
    if (USE_MOCK) {
      const doc = mockDocuments.find((d) => d.id === id);
      if (!doc) throw new Error("Documento não encontrado");
      return { ...doc, ...payload };
    }
    return request<DocumentItem>(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async toggleVisibility(id: string, isPublic: boolean): Promise<void> {
    if (USE_MOCK) return;
    await request(`/documents/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ isPublic }),
    });
  },

  async remove(id: string): Promise<void> {
    if (USE_MOCK) return;
    await request(`/documents/${id}`, { method: "DELETE" });
  },

  getDownloadUrl(id: string): string {
    if (USE_MOCK) return "#";
    return `${API_BASE_URL}/documents/${id}/download`;
  },
};

// ─── CATEGORIAS ────────────────────────────────────────────

export interface CategoryItem {
  id: string;
  name: string;
  documentCount?: number;
}

export const categoryService = {
  async list(): Promise<CategoryItem[]> {
    if (USE_MOCK) {
      return categories.map((c, i) => ({
        id: String(i + 1),
        name: c,
        documentCount: mockDocuments.filter((d) => d.category === c).length,
      }));
    }
    return request<CategoryItem[]>("/categories");
  },

  async create(name: string): Promise<CategoryItem> {
    if (USE_MOCK) {
      return { id: Date.now().toString(), name, documentCount: 0 };
    }
    return request<CategoryItem>("/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async update(id: string, name: string): Promise<CategoryItem> {
    if (USE_MOCK) {
      return { id, name };
    }
    return request<CategoryItem>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },

  async remove(id: string): Promise<void> {
    if (USE_MOCK) return;
    await request(`/categories/${id}`, { method: "DELETE" });
  },
};

// ─── DASHBOARD ─────────────────────────────────────────────

export interface DashboardStats {
  total: number;
  public: number;
  private: number;
  byCategory: { name: string; count: number }[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) {
      const total = mockDocuments.length;
      const pub = mockDocuments.filter((d) => d.isPublic).length;
      return {
        total,
        public: pub,
        private: total - pub,
        byCategory: categories.map((c) => ({
          name: c,
          count: mockDocuments.filter((d) => d.category === c).length,
        })),
      };
    }
    return request<DashboardStats>("/dashboard/stats");
  },
};
