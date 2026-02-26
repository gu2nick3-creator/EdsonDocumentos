# EFN Documentos

Portal de documentos (frontend React) + API (Node/Express) + MySQL.

## Rodar localmente

1) Crie um banco MySQL e configure o `.env`:

```bash
cp .env.example .env
# preencha DB_HOST, DB_USER, DB_PASSWORD, DB_NAME e JWT_SECRET
```

2) Instale e rode:

```bash
npm install
npm run dev
```

> O `npm run dev` roda **apenas o frontend** (Vite).

Para rodar o servidor completo localmente:

```bash
npm run build
npm start
```

## API

A API fica em `/api`.

Endpoints principais:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `POST /api/auth/bootstrap` *(apenas para criar o 1º admin quando não existe usuário)*

Documentos:
- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents` *(multipart/form-data, campo `file`)*
- `PUT /api/documents/:id`
- `PATCH /api/documents/:id/visibility`
- `DELETE /api/documents/:id`
- `GET /api/documents/:id/download`

Categorias:
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

Dashboard:
- `GET /api/dashboard/stats`

## Deploy na Hostinger (Node.js)

### 1) Subir o projeto

- Envie o projeto para o GitHub e conecte na Hostinger **ou** faça upload por File Manager.

### 2) Criar banco MySQL

- No hPanel, crie um banco MySQL e um usuário.
- Guarde **host**, **porta**, **usuário**, **senha** e **nome do banco**.

### 3) Variáveis de ambiente

No painel da aplicação Node.js (Hostinger), configure:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`

Opcional:
- `ADMIN_USERNAME` e `ADMIN_PASSWORD` *(para criar o 1º admin automaticamente)*

Se você não definir `ADMIN_*`, crie o primeiro admin com:

`POST https://SEU-DOMINIO.com/api/auth/bootstrap`

Body JSON:

```json
{ "username": "admin", "password": "SUA_SENHA_FORTE" }
```

### 4) Build e start

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Startup file: `server/index.js`

Pronto. O site vai abrir no domínio e a API vai estar em `/api`.
