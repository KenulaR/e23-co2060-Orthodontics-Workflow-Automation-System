# OrthoFlow Quick Local Setup

This is the shortest accurate setup path for the current repository version.

Replace `/path/to/e23-co2060-Orthodontics-Workflow-Automation-System` below with the local path where you cloned or extracted this repository.

## 1. What This Guide Covers

This guide is for bringing up the current system on a new local device or single-machine environment.

It assumes:

- Node.js 18+ is installed
- npm is installed
- MySQL 8+ is installed and running

The current recommended startup path is the root `start.sh` helper. It installs missing backend/frontend dependencies, initializes an empty database, ensures an admin account exists, starts both services, waits for readiness, and opens the app.

## 2. Configure Backend Environment

From the repository root:

```bash
cd "/path/to/e23-co2060-Orthodontics-Workflow-Automation-System"
cp codes/Backend/.env.example codes/Backend/.env
```

Edit `codes/Backend/.env` at minimum:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=orthoflow

JWT_SECRET=change_this
JWT_REFRESH_SECRET=change_this
SESSION_TIMEOUT_SECONDS=3600

CORS_ORIGIN=http://localhost:5173

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

EMAIL_SIMULATION=true

SEED_ADMIN_NAME=System Administrator
SEED_ADMIN_EMAIL=admin@orthoflow.edu
SEED_ADMIN_DEPARTMENT=Orthodontics
SEED_ADMIN_PASSWORD=change_this_or_leave_blank_for_generated_temporary_password
```

Important:

- `DB_NAME` must contain only letters, numbers, and underscores.
- The configured MySQL user must be able to create/use the configured database.
- If `SEED_ADMIN_PASSWORD` is blank, startup generates and prints a temporary admin password and marks the account for password change.
- If `SEED_ADMIN_PASSWORD` is set, startup uses it and does not send/generate a temporary password email.

## 3. Start the Full System

From the repository root:

```bash
./start.sh
```

If the script is not executable on your device:

```bash
chmod +x start.sh
./start.sh
```

Current helper behavior:

- checks Node.js and npm
- installs backend and frontend dependencies when `node_modules` is missing
- reads database and Google settings from `codes/Backend/.env`
- creates `codes/Frontend/.env` if missing
- copies `GOOGLE_CLIENT_ID` to `VITE_GOOGLE_CLIENT_ID` when the frontend value is missing
- runs `npm run bootstrap-db` to create the database/schema when needed
- runs `npm run ensure-admin` to create or verify an active admin account
- reuses ports `3000` and `5173` if services are already running
- waits for backend health and frontend readiness
- opens the frontend in a browser
- stops managed child processes on `Ctrl+C`

After startup:

- backend: `http://localhost:3000`
- backend health: `http://localhost:3000/health`
- frontend: `http://localhost:5173`

## 4. Manual Backend Start

```bash
cd "/path/to/e23-co2060-Orthodontics-Workflow-Automation-System/codes/Backend"
npm install
npm run bootstrap-db
npm run ensure-admin
npm run dev
```

Manual notes:

- `npm run bootstrap-db` creates the configured database if it does not exist.
- `npm run bootstrap-db` applies runtime schema guards when the database already exists.
- `npm run bootstrap-db` refuses to initialize a non-empty unknown database.
- `npm run ensure-admin` is idempotent when an active admin already exists.
- `npm run reset-admin-password` resets the configured admin password.
- `npm run seed` is still available for a full data reset, but it clears and reloads core application tables. Do not use it as the normal new-device startup path.

## 5. Manual Frontend Start

```bash
cd "/path/to/e23-co2060-Orthodontics-Workflow-Automation-System/codes/Frontend"
npm install
npm run dev
```

Set in `codes/Frontend/.env` if you are not using `start.sh` to populate it:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## 6. Important Current Constraint

The frontend API base is currently hardcoded in `codes/Frontend/src/app/config/api.ts` to:

```ts
BASE_URL: 'http://localhost:3000'
```

So if you deploy the backend anywhere else, you must update that file or place the app behind infrastructure that still exposes the API at that origin.

## 7. Login After Startup

Admin account:

- email comes from `SEED_ADMIN_EMAIL` or defaults to `admin@orthoflow.edu`
- name comes from `SEED_ADMIN_NAME` or defaults to `System Administrator`
- department comes from `SEED_ADMIN_DEPARTMENT` or defaults to `Orthodontics`
- password comes from `SEED_ADMIN_PASSWORD`, or is generated temporarily during `npm run ensure-admin`

If the password is generated, use the value printed by startup and change it immediately after sign-in.

## 8. Google Sign-In

Google Sign-In is optional for local boot, but if you want it working:

1. Create a Google OAuth web client.
2. Add `http://localhost:5173` as an authorized JavaScript origin.
3. Use the same client ID in:
   - `codes/Backend/.env` as `GOOGLE_CLIENT_ID`
   - `codes/Frontend/.env` as `VITE_GOOGLE_CLIENT_ID`

If `VITE_GOOGLE_CLIENT_ID` is missing, the Google button will not initialize.

## 9. Real Email Sending

For local-safe runs, keep:

```env
EMAIL_SIMULATION=true
```

For real SMTP sending, change to:

```env
EMAIL_SIMULATION=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email
SMTP_PASS=your_app_password
SMTP_FROM=your_email
```

This affects reminder emails and admin password email flows.

## 10. Optional Visual PDF Support

For dental-chart visual PDF rendering:

```bash
cd "/path/to/e23-co2060-Orthodontics-Workflow-Automation-System/codes/Backend"
npm i playwright
npx playwright install chromium
```

Without Chromium, the system falls back automatically.

## 11. Quick Verification

Check these after startup:

1. `http://localhost:3000/health`
2. `http://localhost:5173`
3. sign in with the configured admin account or another created user
4. open patients, queue, or materials depending on role
5. for admin, verify reports and audit log pages load
