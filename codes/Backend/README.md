# OrthoFlow Backend

Express + MySQL backend for the current Orthodontics Workflow Automation System.

## Stack

- Node.js
- Express
- MySQL via `mysql2`
- JWT access and refresh tokens
- Joi validation
- Multer uploads
- Nodemailer email delivery or simulation

## Run Locally

Recommended full-system startup from the repository root:

```bash
cp codes/Backend/.env.example codes/Backend/.env
# edit codes/Backend/.env with your local MySQL credentials and admin values
./start.sh
```

The root `start.sh` helper installs missing dependencies, initializes the database when needed, ensures an admin account exists, starts the backend and frontend, waits for readiness, and opens the app.

Manual backend-only startup:

```bash
cd codes/Backend
npm install
cp .env.example .env
npm run bootstrap-db
npm run ensure-admin
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Important:

- `npm run bootstrap-db` creates the configured database/schema when it is missing or empty
- `npm run bootstrap-db` refuses to initialize a non-empty unknown database
- `npm run ensure-admin` creates or verifies an active admin account from `SEED_ADMIN_*` values
- `npm run seed` clears and reloads core application tables; use it only for a deliberate reset
- `npm run dev` currently runs `node server.js`

## Environment

Use `codes/Backend/.env.example` as the source of truth.

Important variables:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRE`, `JWT_REFRESH_EXPIRE`
- `SESSION_TIMEOUT_SECONDS`
- `GOOGLE_CLIENT_ID`
- `EMAIL_SIMULATION`, `SMTP_*`
- `AUDIT_LOG_RETENTION_*`
- `UPLOAD_DIR`, `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`
- `CORS_ORIGIN`

## API Roots

- API index: `GET /api`
- health: `GET /health`
- auth: `/api/auth`
- patients: `/api/patients`
- visits: `/api/visits`
- documents: `/api/documents`
- clinical notes: `/api/clinical-notes`
- queue: `/api/queue`
- cases: `/api/cases`
- inventory: `/api/inventory`
- users: `/api/users`
- reports: `/api/reports`

## Current Behavior Highlights

- DB connection test runs on startup
- access-control schema checks run on startup
- audit retention job starts with the server
- automatic reminder job starts with the server
- session inactivity timeout is enforced
- Google Sign-In uses backend audience validation against `GOOGLE_CLIENT_ID`
- inventory supports restore flow and transaction-safe deletion behavior
- dental-chart version workflows support download and orthodontist-managed bin actions

## Scripts

```bash
npm run dev
npm start
npm run bootstrap-db
npm run ensure-admin
npm run reset-admin-password
npm run migrate
npm run seed
```

Script notes:

- `bootstrap-db`: initializes a missing/empty database from `database-schema.sql` and runs runtime schema guards.
- `ensure-admin`: creates the configured admin only when no active admin exists.
- `reset-admin-password`: resets/promotes the configured admin and prints or emails a temporary password when needed.
- `migrate`: applies the schema file manually.
- `seed`: destructive reset utility that clears and reloads core application tables.

## Local Admin Account

Admin account values come from `SEED_ADMIN_*` in `codes/Backend/.env`:

- email: `SEED_ADMIN_EMAIL` or `admin@orthoflow.edu`
- name: `SEED_ADMIN_NAME` or `System Administrator`
- department: `SEED_ADMIN_DEPARTMENT` or `Orthodontics`
- password: `SEED_ADMIN_PASSWORD`, or a generated temporary password printed during setup

## Notes

For visual dental-chart PDF exports with Chromium:

```bash
cd codes/Backend
npm i playwright
npx playwright install chromium
```

Fallback PDF behavior is used automatically if Chromium is unavailable.
