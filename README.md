# Zorvyn Finance API

A production-ready **Finance Data Processing and Access Control** backend built with **Node.js**, **Express.js**, and **SQLite** (via `better-sqlite3`).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Role-Based Access Control](#role-based-access-control)
- [Data Model](#data-model)
- [Design Decisions & Assumptions](#design-decisions--assumptions)

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Runtime      | Node.js 18+                       |
| Framework    | Express.js 5                      |
| Database     | SQLite via `better-sqlite3`       |
| Auth         | JWT (`jsonwebtoken`) + `bcryptjs` |
| Validation   | Zod                               |
| API Docs     | Swagger UI (`swagger-jsdoc`)      |
| Security     | Helmet, CORS, express-rate-limit  |
| Logging      | Morgan                            |

---

## Architecture

```
src/
├── config/
│   ├── database.js      # SQLite init, migrations, admin seed
│   └── swagger.js       # OpenAPI 3.0 spec config
├── controllers/
│   ├── auth.controller.js
│   ├── user.controller.js
│   └── finance.controller.js
├── middleware/
│   ├── auth.js          # JWT verification → req.user
│   ├── roles.js         # requireRole / requireMinRole guards
│   ├── validate.js      # Zod-powered request validation
│   └── errorHandler.js  # Global Express error handler
├── models/
│   ├── user.model.js    # SQLite queries for users table
│   └── record.model.js  # SQLite queries for financial_records table
├── routes/
│   ├── index.js         # Route aggregator + /api/health
│   ├── auth.routes.js
│   ├── user.routes.js
│   └── finance.routes.js
├── services/
│   ├── auth.service.js  # register / login business logic
│   ├── user.service.js  # user management business logic
│   └── finance.service.js # records + dashboard business logic
└── utils/
    └── response.js      # sendSuccess / sendError helpers
index.js                 # App entry point
```

The layering is: **Routes → Controllers → Services → Models → Database**.  
Controllers handle HTTP concerns only; all business logic lives in services.

---

## Features

- ✅ **JWT Authentication** — register, login, token-protected routes
- ✅ **Role-Based Access Control** — Viewer / Analyst / Admin with middleware guards
- ✅ **Financial Records CRUD** — create, read, update, soft-delete
- ✅ **Advanced Filtering** — by type, category, date range, full-text search on notes
- ✅ **Pagination** — all list endpoints support `page` + `limit`
- ✅ **Dashboard Analytics** — summary, category breakdown, monthly/weekly trends, recent activity
- ✅ **Input Validation** — Zod schemas on every mutating endpoint
- ✅ **Soft Delete** — records are never hard-deleted; `deleted_at` timestamp is set
- ✅ **Rate Limiting** — global 200 req/15 min; auth endpoints 15 req/15 min
- ✅ **Swagger UI** — interactive docs at `/api-docs`
- ✅ **Automatic Admin Seed** — first admin user created from `.env` on startup

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd zorvyn-backend-assignment
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum, change JWT_SECRET
```

### 3. Start the server

```bash
npm start
# or with auto-reload:
npm run dev:watch
```

The server starts on **http://localhost:3000** by default.  
Swagger docs are available at **http://localhost:3000/api-docs**.

### 4. Default Admin Credentials

On first startup, if no admin exists, one is automatically seeded:

| Field    | Default Value        |
|----------|----------------------|
| Email    | `admin@zorvyn.com`   |
| Password | `Admin@123`          |

> ⚠️ Change these via `.env` before deploying.

---

## Environment Variables

| Variable         | Default                        | Description                              |
|------------------|--------------------------------|------------------------------------------|
| `PORT`           | `3000`                         | HTTP server port                         |
| `NODE_ENV`       | `development`                  | `development` or `production`            |
| `JWT_SECRET`     | *(required)*                   | Secret key for signing JWTs              |
| `JWT_EXPIRES_IN` | `7d`                           | JWT token TTL                            |
| `ADMIN_EMAIL`    | `admin@zorvyn.com`             | Seed admin email                         |
| `ADMIN_PASSWORD` | `Admin@123`                    | Seed admin password                      |
| `ADMIN_NAME`     | `Super Admin`                  | Seed admin display name                  |
| `DB_PATH`        | `./data/finance.db`            | SQLite database file path                |

---

## API Overview

All endpoints are prefixed with `/api`. Full interactive docs at `/api-docs`.

### Auth

| Method | Endpoint            | Auth Required | Description                      |
|--------|---------------------|---------------|----------------------------------|
| POST   | `/api/auth/register`| No            | Create a new account (viewer)    |
| POST   | `/api/auth/login`   | No            | Login, receive JWT               |
| GET    | `/api/auth/me`      | Yes           | Get current user's profile       |

### Users *(admin only)*

| Method | Endpoint                  | Description               |
|--------|---------------------------|---------------------------|
| GET    | `/api/users`              | List all users (paginated)|
| GET    | `/api/users/:id`          | Get user by ID            |
| PATCH  | `/api/users/:id/role`     | Change a user's role      |
| PATCH  | `/api/users/:id/status`   | Activate / deactivate     |
| DELETE | `/api/users/:id`          | Delete user               |

### Financial Records

| Method | Endpoint             | Min Role | Description                          |
|--------|----------------------|----------|--------------------------------------|
| GET    | `/api/records`       | Viewer   | List records (paginated + filtered)  |
| GET    | `/api/records/:id`   | Viewer   | Get a single record                  |
| POST   | `/api/records`       | Analyst  | Create a record                      |
| PATCH  | `/api/records/:id`   | Analyst  | Update a record                      |
| DELETE | `/api/records/:id`   | Admin    | Soft-delete a record                 |

### Dashboard / Analytics

| Method | Endpoint                            | Min Role | Description                      |
|--------|-------------------------------------|----------|----------------------------------|
| GET    | `/api/records/dashboard/summary`    | Viewer   | Total income, expense, balance   |
| GET    | `/api/records/dashboard/categories` | Viewer   | Category totals by type          |
| GET    | `/api/records/dashboard/trends`     | Analyst  | Monthly / weekly trends          |
| GET    | `/api/records/dashboard/recent`     | Viewer   | Most recent transactions         |

### Health

| Method | Endpoint      | Auth | Description         |
|--------|---------------|------|---------------------|
| GET    | `/api/health` | No   | Server health check |

---

## Role-Based Access Control

Three roles are defined with a clear hierarchy:

```
admin  ──▶  full access (manage users + all record operations)
  ↑
analyst ──▶  read + create + update records; view trends
  ↑
viewer  ──▶  read-only (records + basic dashboard)
```

Access control is enforced with two middleware factories in `src/middleware/roles.js`:

- **`requireRole(...roles)`** — exact role match (e.g., `admin` only)
- **`requireMinRole(minRole)`** — role level ≥ minimum (e.g., `analyst` or `admin`)

---

## Data Model

### `users`

| Column       | Type    | Notes                                  |
|--------------|---------|----------------------------------------|
| `id`         | INTEGER | Primary key (auto-increment)           |
| `name`       | TEXT    | Display name                           |
| `email`      | TEXT    | Unique                                 |
| `password`   | TEXT    | bcrypt hash (cost factor 12), never returned in API responses |
| `role`       | TEXT    | `viewer` / `analyst` / `admin`         |
| `status`     | TEXT    | `active` / `inactive`                  |
| `created_at` | TEXT    | ISO 8601                               |
| `updated_at` | TEXT    | ISO 8601                               |

### `financial_records`

| Column       | Type    | Notes                                                  |
|--------------|---------|--------------------------------------------------------|
| `id`         | INTEGER | Primary key                                            |
| `amount`     | INTEGER | Stored as **cents** (e.g., `150050` = $1,500.50) to avoid float precision issues |
| `type`       | TEXT    | `income` or `expense`                                  |
| `category`   | TEXT    | Free-form string (e.g., "Salary", "Rent")              |
| `date`       | TEXT    | `YYYY-MM-DD`                                           |
| `notes`      | TEXT    | Optional description                                   |
| `created_by` | INTEGER | FK → `users.id`                                        |
| `deleted_at` | TEXT    | `NULL` = active; set to timestamp on soft delete       |
| `created_at` | TEXT    | ISO 8601                                               |
| `updated_at` | TEXT    | ISO 8601                                               |

---

## Design Decisions & Assumptions

### Why SQLite?
SQLite via `better-sqlite3` is synchronous, zero-config, and perfectly suited for a self-contained assignment. WAL mode is enabled for improved concurrent read performance. A production system would swap this for PostgreSQL with minimal changes.

### Amounts stored in cents
Floating-point arithmetic is unreliable for financial data. All amounts are stored as integers (cents) internally and converted to/from decimal numbers at the model boundary. This mirrors how Stripe and other payment systems handle money.

### Soft deletes on records
Financial data should never be permanently destroyed — soft deletes preserve an audit trail. Records with a non-null `deleted_at` are excluded from all queries by default.

### Zod for validation
Zod gives us schema-first validation with excellent TypeScript compatibility and clear error messages. The `validate` middleware centralises this so controllers stay thin.

### JWT re-validation on every request
The `auth` middleware re-fetches the user from SQLite on every authenticated request. This ensures deactivated users are locked out immediately without waiting for token expiry — a small performance trade-off for better security.

### Express 5
Express 5 automatically propagates async errors to the next error handler, removing the need for `try/catch` in async route handlers. Controllers are currently written with manual try/catch for clarity and compatibility.

### Role hierarchy
The `requireMinRole` guard uses a numeric hierarchy (`viewer=0, analyst=1, admin=2`). This makes it trivial to add new roles in the future by inserting them into the hierarchy object.
