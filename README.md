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
- JWT is stored in `localStorage` and sent as `Authorization: Bearer <token>`.
- Ticket title auto-fills from ticket type. If ticket type is `OTROS`, the UI shows a custom title field that becomes the stored title.
- Delete safeguard: only Admin can delete, and only if status is `Nuevo` and within 24 hours of creation.
