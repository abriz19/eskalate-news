# Eskalate News – Backend API

REST API for a news platform with author content management, public feed, read tracking, and role-based access.

---

## 1. Project Overview

Eskalate News provides:

- **Authentication** – Secure signup and login with JWT. Passwords are hashed with Argon2.
- **Role-based access control (RBAC)** – Two roles:
  - **AUTHOR** – Can create, update, and soft-delete articles; access “my articles” and author dashboard.
  - **READER** – Can browse the public feed and read articles; cannot manage content.
- **Author content management** – Authors create articles (initially draft), update them, and soft-delete. Article lifecycle: Draft → Published → Soft Deleted.
- **Public news feed** – Paginated list of published, non-deleted articles with optional filters (category, author name, title search).
- **Read tracking and analytics** – Each article view is logged (with a per-article, per-reader cooldown) for analytics. Designed to handle high read volume.
- **Author dashboard** – Paginated view of the author’s articles with aggregated view counts.

---

## 2. Technology Stack

| Technology   | Purpose |
|-------------|---------|
| **Node.js** | Runtime |
| **TypeScript** | Typed JavaScript, strict mode |
| **Express** | HTTP server and routing |
| **Prisma** | ORM and migrations for PostgreSQL |
| **PostgreSQL** | Database |
| **JWT** | Stateless auth (sign/verify tokens) |
| **Argon2** | Password hashing |
| **Zod** | Request/query validation and schemas |
| **Docker** | Local PostgreSQL via `docker-compose` |

---

## 3. Environment Variables

Copy `.env.example` to `.env` and set values. Example:

```env
# PostgreSQL connection string (Prisma).
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="postgresql://eskalate:eskalate_secret@localhost:5432/eskalate_news?schema=public"

# Port the API listens on
PORT=5000

# Secret for signing and verifying JWT tokens (use a long, random value in production)
JWT_SECRET="your-secret-key-at-least-32-chars-long"

# development | production | test
NODE_ENV=development
```

| Variable       | Description |
|----------------|-------------|
| `DATABASE_URL` | Full PostgreSQL URL; must match the DB started with `docker-compose` (or your own DB). |
| `PORT`         | Server port (default `5000`). |
| `JWT_SECRET`   | Secret key for JWT; required for auth and tests. |
| `NODE_ENV`     | Environment name; affects behavior (e.g. read-tracking timers, test mode). |

---

## 4. Setup & Running Locally

**Prerequisites:** Node.js (v18+), npm, Docker and Docker Compose.

### Clone and install

```bash
git clone <repository-url>
cd eskalate-news/backend
npm install
```

### Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with user `eskalate`, password `eskalate_secret`, database `eskalate_news` (see `docker-compose.yml`).

### Configure environment

```bash
cp .env.example .env
```

Edit `.env` if you changed DB credentials or port in `docker-compose.yml`. Ensure `DATABASE_URL` matches (host `localhost`, port `5432`, user/password/database as above).

### Run migrations

```bash
npx prisma migrate dev
```

### Start the dev server

```bash
npm run dev
```

This runs the TypeScript compiler in watch mode and nodemon; the API is available at `http://localhost:5000` (or the port set in `PORT`).

---

## 5. API Documentation

Interactive API docs (Swagger UI) are served at:

**`http://localhost:5000/api/docs`**

Use it to explore endpoints, try requests, and see request/response schemas. Protected routes require a JWT in the `Authorization: Bearer <token>` header (obtain a token via `POST /api/auth/login`).

---

## 6. Testing

Tests use **Jest** and **Supertest**. The database is **mocked** (Prisma client is mocked); no real DB is used.

### Run tests

From the `backend` directory:

```bash
npm test
```

Ensure `JWT_SECRET` is set in your environment (e.g. in `.env`) so auth and RBAC tests can verify tokens.

### What’s tested

- **Auth** – Register, login, validation and error responses.
- **Articles** – Public feed, create/update/soft-delete, “my articles,” get by ID; auth and RBAC (AUTHOR vs READER).
- **Author dashboard** – Paginated dashboard, AUTHOR-only access.
- **Read tracking** – Cooldown logic (at most one ReadLog per article per reader in a 10-second window).

### Concurrency control for ReadLog

To avoid duplicate or excessive read logs when the same user (or guest) hits the same article repeatedly, the API uses an **in-memory cooldown**: at most one `ReadLog` per `(articleId, readerId)` per 10 seconds. Old entries are pruned periodically to limit memory use. Unit tests cover this behavior (see `readTracking.test.ts` and the articles test that asserts no duplicate ReadLog within the cooldown).

---

## Quick reference

| Command              | Description                    |
|----------------------|--------------------------------|
| `npm run dev`        | Start dev server (watch + nodemon) |
| `npm run build`      | Compile TypeScript to `dist/` |
| `npm test`           | Run Jest unit tests           |
| `npx prisma migrate dev` | Apply migrations          |
| `docker compose up -d`   | Start PostgreSQL         |
