# OrthoFlow Full-Stack Integration Guide

This document reflects the current repository state as of April 15, 2026.

## 1. Current Stack

- Backend: Node.js + Express + MySQL
- Frontend: React + Vite
- Authentication: email/password plus Google Sign-In using Google ID tokens
- Session model: JWT access token + refresh token with inactivity timeout enforcement
- File handling: Multer uploads, document download endpoints, dental-chart PDF export with Playwright fallback support

## 2. Repository Layout

```text
e23-co2060-Orthodontics-Workflow-Automation-System/
├── codes/
│   ├── Backend/
│   │   ├── server.js
│   │   ├── .env
│   │   ├── database-schema.sql
│   │   ├── scripts/
│   │   │   ├── bootstrap-database.js
│   │   │   ├── ensure-admin.js
│   │   │   ├── migrate.js
│   │   │   └── seed.js
│   │   └── src/
│   │       ├── controllers/
│   │       ├── middleware/
│   │       ├── routes/
│   │       └── services/
│   └── Frontend/
│       ├── .env
│       └── src/app/
└── start.sh
```

## 3. Backend Integration Surface

`codes/Backend/server.js` starts the API, validates the DB connection, ensures access-control schema updates exist, and starts two background jobs:

- audit log retention cleanup
- automatic appointment reminder processing

Current API roots:

- `/api/auth`
- `/api/patients`
- `/api/visits`
- `/api/documents`
- `/api/clinical-notes`
- `/api/queue`
- `/api/cases`
- `/api/inventory`
- `/api/users`
- `/api/reports`
- `/api/payment-records`
- `/api/patient-materials`

Operational endpoints:

- `GET /health`
- `GET /api`
- static uploads at `/uploads`

## 4. Frontend Integration Surface

The frontend router currently exposes these authenticated pages:

- `/` dashboard
- `/patients`
- `/patients/:id`
- `/queue`
- `/cases`
- `/reports`
- `/materials`
- `/requests/approvals`
- `/settings`
- `/admin/users`
- `/admin/audit-logs`

Role-gated navigation currently matches the shipped UI:

- All signed-in users: dashboard, patients, settings
- Admin, orthodontist, dental surgeon, student, nurse, reception: clinic queue
- Admin, orthodontist, dental surgeon, student: student cases
- Admin only: reports, user management, audit log
- Admin and nurse: materials/inventory
- Orthodontist and dental surgeon: request approvals

Important current implementation detail:

- The frontend API base URL is hardcoded to `http://localhost:3000` in `codes/Frontend/src/app/config/api.ts`
- The frontend uses `codes/Frontend/.env` for `VITE_GOOGLE_CLIENT_ID`
- For any non-localhost deployment, the frontend API base must be changed in code unless a reverse proxy preserves that backend origin

## 5. Core Implemented Domains

Current end-to-end domains in the codebase:

- authentication and token refresh
- user management with admin-created accounts and password reset email flow
- patient directory with filters, inactive/reactivate flow, and assignment management
- pending assignment approval workflow for orthodontists and dental surgeons
- patient profile tabs for overview, visits, patient history, dental chart, documents, diagnosis, and treatment plan/notes
- visit scheduling and reminder sending
- clinic queue management
- student case tracking
- inventory/materials management with stock updates and restore flow
- reports dashboard for admin
- audit log browsing for admin

## 6. Security and Access Model

Current security behavior in the running system:

- `helmet`, `cors`, `compression`, and request logging are enabled
- JWT access and refresh tokens are used
- inactivity timeout is enforced with `SESSION_TIMEOUT_SECONDS`
- users flagged with `must_change_password` are forced to `/settings`
- auth routes use stricter rate limiting
- object-level access checks are enforced through `codes/Backend/src/middleware/accessControl.js`

Notable current access behavior:

- inventory mutation routes are restricted to `NURSE`
- admin can manage users and read reports/audit logs
- receptionist workflows focus on patient-general and appointment operations
- orthodontist and dental surgeon workflows are assignment-aware
- diagnosis and treatment access differs by role and patient assignment

## 7. Required Environment Configuration

Backend environment comes from `codes/Backend/.env`.

Minimum backend values:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=orthoflow

JWT_SECRET=change_this
JWT_REFRESH_SECRET=change_this
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
SESSION_TIMEOUT_SECONDS=3600

CORS_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

EMAIL_SIMULATION=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email
SMTP_PASS=your_app_password
SMTP_FROM=your_email

SEED_ADMIN_NAME=System Administrator
SEED_ADMIN_EMAIL=admin@orthoflow.edu
SEED_ADMIN_DEPARTMENT=Orthodontics
SEED_ADMIN_PASSWORD=
```

Other active backend settings supported today:

- `AUDIT_LOG_RETENTION_*`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE`
- `ALLOWED_FILE_TYPES`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `LOG_LEVEL`

Admin bootstrap behavior:

- `SEED_ADMIN_NAME` and `SEED_ADMIN_EMAIL` control the initial admin identity
- `SEED_ADMIN_DEPARTMENT` defaults to `Orthodontics`
- if `SEED_ADMIN_PASSWORD` is blank, `npm run ensure-admin` generates a temporary password and forces password change on first login
- if `SEED_ADMIN_PASSWORD` is provided, that password is used and `must_change_password` is not set
- `npm run ensure-admin` leaves an existing active admin unchanged unless `npm run reset-admin-password` is used

Frontend environment:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## 8. Local Full-Stack Startup

### Recommended new-device startup

From the repository root:

```bash
cp codes/Backend/.env.example codes/Backend/.env
# edit codes/Backend/.env with the local MySQL credentials and admin values
./start.sh
```

The root `start.sh` helper:

- installs backend and frontend dependencies when `node_modules` is missing
- creates `codes/Frontend/.env` if missing
- copies `GOOGLE_CLIENT_ID` to `VITE_GOOGLE_CLIENT_ID` when the frontend value is missing
- runs `npm run bootstrap-db` to create the configured database/schema when needed
- runs `npm run ensure-admin` to create or verify an active admin account
- starts backend on `http://localhost:3000`
- starts frontend on `http://localhost:5173`
- waits for readiness, opens the browser, and stops managed child processes on `Ctrl+C`

### Backend manual startup

From `codes/Backend/`:

```bash
npm install
npm run bootstrap-db
npm run ensure-admin
npm run dev
```

Notes:

- `npm run bootstrap-db` initializes a missing or empty OrthoFlow database and applies runtime schema guards.
- `npm run bootstrap-db` refuses to initialize a non-empty unknown database.
- `npm run ensure-admin` is idempotent when an active admin exists.
- `npm run seed` remains available for deliberate data reset, but it clears core application tables and is not the normal startup path.
- `npm run dev` currently runs `node server.js`.

### Frontend manual startup

From `codes/Frontend/`:

```bash
npm install
npm run dev
```

### Two-terminal manual startup

Terminal 1:

```bash
cd codes/Backend && npm run bootstrap-db && npm run ensure-admin && npm run dev
```

Terminal 2:

```bash
cd codes/Frontend && npm run dev
```

## 9. Local Admin Account

`codes/Backend/scripts/ensure-admin.js` ensures at least one active admin user from `codes/Backend/.env`:

- email: `SEED_ADMIN_EMAIL` or `admin@orthoflow.edu`
- name: `SEED_ADMIN_NAME` or `System Administrator`
- department: `SEED_ADMIN_DEPARTMENT` or `Orthodontics`
- password:
  - `SEED_ADMIN_PASSWORD` if provided
  - otherwise an auto-generated temporary password printed by the setup command

If the password is auto-generated, the admin must change it after the first login.

`codes/Backend/scripts/seed.js` is a reset utility. It creates a baseline admin too, but it first clears core application tables.

## 10. Google Sign-In

Google login is implemented but only works when both sides use a valid client ID.

Required setup:

1. Create a Google OAuth web client.
2. Add `http://localhost:5173` to authorized JavaScript origins.
3. Put the same client ID in:
   - `codes/Backend/.env` as `GOOGLE_CLIENT_ID`
   - `codes/Frontend/.env` as `VITE_GOOGLE_CLIENT_ID`

Current backend behavior:

- validates Google ID token audience against `GOOGLE_CLIENT_ID`
- accepts comma-separated backend client IDs if needed

## 11. Operational Validation

Recommended manual validation after startup:

1. Open `http://localhost:3000/health` and confirm the backend responds.
2. Open `http://localhost:5173` and confirm the frontend loads.
3. Sign in with an account appropriate for the workflow you want to validate.
4. Verify patients, queue, materials, and admin-only pages behave according to role.
5. Confirm save, delete, restore, and download actions show visible feedback in the UI.
