# Ticket Management App (Full Stack)

Monorepo with:
- `/backend` (Node.js + Express + TypeScript + Prisma v7 + SQLite)
- `/frontend` (React + TypeScript + Vite)

## Prerequisites
- Node.js 20+
- npm 10+
- SQLite (bundled with Prisma)

## Setup (Windows/macOS/Linux)

### 1) Clone and install dependencies
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2) Backend environment
```bash
cd backend
cp .env.example .env
```
Edit `.env` if needed.

### 3) Database migration + seed
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 4) Start backend
```bash
cd backend
npm run dev
```
The API will run on `http://localhost:4000`.

### 5) Start frontend
```bash
cd frontend
cp .env.example .env
npm run dev
```
The UI will run on `http://localhost:5173`.

## Login (Admin)
- Email: `admin@local.test`
- Password: `Admin123!`

## Reports
- Admin can generate reports in the Admin UI.
- Reports are stored on disk in `/backend/reports` and tracked in the `Report` table.

## Scheduled Reports
- Daily at 23:55
- Weekly every Sunday at 23:55
- Monthly on day 1 at 00:10

## Manual Reports (API)
```bash
POST /api/reports/generate?period=daily|weekly|monthly
```

## Storage
- Attachments are stored in `/backend/uploads`.
- Reports are stored in `/backend/reports`.

## Notes / Assumptions
- App Settings (Admin → App) lets you configure header and sidebar colors, persisted in SQLite via Prisma.
- JWT is stored in `localStorage` and sent as `Authorization: Bearer <token>`.
- Ticket title auto-fills from ticket type. If ticket type is `OTHER`, the UI shows a custom title field that becomes the stored title.
- Delete safeguard: only Admin can delete, and only if status is `NEW` and within 24 hours of creation.


## Ticket Table Views (CRM-style)

### Available `view` keys
- `ALL_TICKETS`
- `CREATED_BY_ME`
- `ASSIGNED_TO_ME`
- `RESOLVED_RELATED_ACTIVE`
- `UNASSIGNED_OPEN`
- `RESOLVED_CREATED_BY_ME`

### Backend validation rules
- Endpoint: `GET /api/tickets?view=<VIEW_KEY>`.
- If `view` is missing, existing ticket listing behavior is preserved.
- If `view` is unknown, backend returns `400 Invalid ticket view`.
- If `view` is valid but not allowed for the logged-in role, backend returns `403 Ticket view not allowed for this role`.
- View filters are centralized in `buildTicketWhere(viewKey, currentUser)` in `backend/src/constants/ticketViews.ts`.

### Role access matrix
- `ADMIN`: `ALL_TICKETS`, `CREATED_BY_ME`, `ASSIGNED_TO_ME`, `RESOLVED_RELATED_ACTIVE`, `UNASSIGNED_OPEN`
- `TECH`: `CREATED_BY_ME`, `ASSIGNED_TO_ME`, `RESOLVED_RELATED_ACTIVE`, `UNASSIGNED_OPEN`
- `REQUESTER`: `CREATED_BY_ME`, `RESOLVED_CREATED_BY_ME`

### How to add a new view
1. Add a new key in `TICKET_VIEW_KEY` in backend and frontend constants files.
2. Add metadata (`label`, `description`, `rolesAllowed`) in each view definitions map/list.
3. Extend backend `buildTicketWhere` with the Prisma `where` clause for the new key.
4. (Optional) update role defaults in `DEFAULT_TICKET_VIEW_BY_ROLE` for UI behavior.
5. Add/update tests under `backend/tests` to validate key, permissions, and filter behavior.

### Tests
```bash
cd backend
npm test
```
