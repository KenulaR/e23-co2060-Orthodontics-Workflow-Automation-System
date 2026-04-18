# OrthoFlow Frontend

React + Vite frontend for the current Orthodontics Workflow Automation System.

## Run Locally

Recommended full-system startup from the repository root:

```bash
cp codes/Backend/.env.example codes/Backend/.env
# edit codes/Backend/.env with your local MySQL credentials and admin values
./start.sh
```

The root `start.sh` helper installs missing dependencies, creates `codes/Frontend/.env` if needed, copies `GOOGLE_CLIENT_ID` from the backend env when `VITE_GOOGLE_CLIENT_ID` is missing, starts both services, waits for readiness, and opens the app.

Manual frontend-only startup:

```bash
cd codes/Frontend
npm install
cp .env.example .env
npm run dev
```

Default URL:

- `http://localhost:5173`

## Environment

Set in `codes/Frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## Backend Dependency

The frontend currently expects the backend API at `http://localhost:3000`.

That base URL is hardcoded in:

- `codes/Frontend/src/app/config/api.ts`

Run backend in parallel manually:

```bash
cd ../Backend
npm run bootstrap-db
npm run ensure-admin
npm run dev
```

## Current Functional Coverage

- email/password login
- Google login button and Google auth flow
- role-aware navigation and route gating
- dashboard with refresh behavior
- patient directory filters and assignment workflows
- patient profile tabs for overview, visits, history, dental chart, documents, diagnosis, and treatment notes
- clinic queue
- student cases
- materials/inventory workflows
- request approvals for clinician assignment changes
- admin reports and audit-log pages
- settings password change flow

## Build

```bash
npm run build
```

## Current Routes

- `/`
- `/login`
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

## UI Notes

Current UI patterns emphasize:

- visible feedback for refresh, submit, and download actions
- explicit restricted-access messaging where the UX requires visibility without edit rights
- role-aware navigation instead of exposing unusable pages
