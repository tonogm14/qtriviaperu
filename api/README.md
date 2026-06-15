# QTriviaPeru API

Backend REST API + WebSocket server for **QTriviaPeru** — a live trivia game app from Peru.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Language**: TypeScript
- **ORM**: Prisma (PostgreSQL)
- **Auth**: JWT + bcryptjs
- **Real-time**: Socket.io 4
- **Validation**: Zod
- **Port**: 3001

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

## Quick Start

### 1. Install dependencies

```bash
cd api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL` and a strong `JWT_SECRET`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/qtriviaperu?schema=public"
JWT_SECRET=your-super-secret-key-at-least-32-chars
```

### 3. Setup with Migrations

```bash
# Create the database in PostgreSQL first, then run:

# Option A — production/CI (runs existing migration files):
npx prisma migrate deploy

# Option B — development (creates and tracks new migrations):
npx prisma migrate dev --name init
```

### 4. Generate Prisma client

```bash
npm run prisma:generate
# or: npx prisma generate
```

### 5. Seed the database

```bash
npm run seed
```

This creates:
- 1 admin user + 5 regular users
- 20 trivia questions (in Spanish, Peru-themed)
- 3 sample games (1 finished, 2 upcoming)
- Sample notifications and a withdrawal record

**Seed credentials:**

| Role  | Email                     | Password    |
|-------|---------------------------|-------------|
| Admin | admin@qtriviaperu.com     | Admin1234!  |
| User  | carlos@example.com        | User1234!   |
| User  | maria@example.com         | User1234!   |
| User  | jose@example.com          | User1234!   |
| User  | ana@example.com           | User1234!   |
| User  | pedro@example.com         | User1234!   |

### 6. Start development server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`.

Health check: `GET http://localhost:3001/health`

---

## API Reference

All endpoints are prefixed with `/api`.

Successful responses: `{ data: T }`
Paginated responses: `{ data: T[], total, page, limit }`
Error responses: `{ error: string, code?: string }`

### Authentication

All protected routes require the header:
```
Authorization: Bearer <token>
```

---

### Auth — `/api/auth`

| Method | Path       | Auth     | Description              |
|--------|------------|----------|--------------------------|
| POST   | /register  | No       | Register new user        |
| POST   | /login     | No       | Login, receive JWT       |
| POST   | /recover   | No       | Trigger password recover |
| GET    | /me        | Required | Get current user         |
| PUT    | /me        | Required | Update profile           |

**POST /register body:**
```json
{
  "name": "Carlos Quispe",
  "email": "carlos@example.com",
  "username": "carlosq",
  "password": "SecurePass1!",
  "phone": "999111222"
}
```

**POST /login body:**
```json
{ "email": "carlos@example.com", "password": "SecurePass1!" }
```

---

### Games — `/api/games`

| Method | Path               | Auth   | Description                |
|--------|--------------------|--------|----------------------------|
| GET    | /                  | No     | List games (filter+paginate)|
| GET    | /:id               | No     | Game detail                |
| POST   | /                  | Admin  | Create game                |
| PUT    | /:id               | Admin  | Update game                |
| DELETE | /:id               | Admin  | Delete game                |
| POST   | /:id/join          | User   | Join game                  |
| POST   | /:id/start         | Admin  | Start game (PENDING→LIVE)  |
| GET    | /:id/leaderboard   | No     | Game leaderboard           |

**Query params for GET /:**
- `status` — PENDING | LOBBY | LIVE | FINISHED | CANCELLED
- `date` — ISO date string (e.g. `2024-03-15`)
- `page`, `limit`

---

### Questions — `/api/questions`

| Method | Path    | Auth  | Description        |
|--------|---------|-------|--------------------|
| GET    | /       | No    | List questions     |
| GET    | /:id    | No    | Question detail    |
| POST   | /       | Admin | Create question    |
| PUT    | /:id    | Admin | Update question    |
| DELETE | /:id    | Admin | Delete question    |
| POST   | /bulk   | Admin | Bulk import        |

**Question body:**
```json
{
  "text": "¿Cuál es la capital de Perú?",
  "options": ["Lima", "Cusco", "Arequipa", "Trujillo"],
  "correctIndex": 0,
  "category": "Geografía",
  "difficulty": "EASY"
}
```

**Bulk import body:**
```json
{ "questions": [ ...questionArray ] }
```

---

### Users — `/api/users`

| Method | Path       | Auth  | Description        |
|--------|------------|-------|--------------------|
| GET    | /          | Admin | List users         |
| GET    | /:id       | User  | User detail        |
| PUT    | /:id       | Admin | Update user        |
| GET    | /:id/stats | User  | User game stats    |

---

### Withdrawals — `/api/withdrawals`

| Method | Path          | Auth  | Description             |
|--------|---------------|-------|-------------------------|
| GET    | /             | User  | List withdrawals        |
| POST   | /             | User  | Request withdrawal      |
| PUT    | /:id/status   | Admin | Update withdrawal status|

**POST / body:**
```json
{
  "amount": 50,
  "method": "yape",
  "accountRef": "999111222"
}
```

Methods: `yape` (free), `plin` (free), `bank` (S/2 fee, 24-48h)
Minimum amount: S/20

**Withdrawal code format:** `QT-XXXX-X`

---

### Leaderboard — `/api/leaderboard`

| Method | Path | Auth | Description        |
|--------|------|------|--------------------|
| GET    | /    | No   | Global leaderboard |

**Query params:**
- `period` — `today` | `week` | `month` | `all` (default: all)
- `page`, `limit`

---

### Notifications — `/api/notifications`

| Method | Path         | Auth | Description           |
|--------|--------------|------|-----------------------|
| GET    | /            | User | List notifications    |
| PUT    | /:id/read    | User | Mark one as read      |
| PUT    | /read-all    | User | Mark all as read      |

**Query params for GET /:**
- `unreadOnly=true`
- `page`, `limit`

---

## Socket.IO Events

Connect to `ws://localhost:3001` (or via polling at the same URL).

### Client → Server

| Event          | Payload                                          | Description          |
|----------------|--------------------------------------------------|----------------------|
| `join:lobby`   | `{ gameId, userId }`                             | Join a game room     |
| `submit:answer`| `{ gameId, userId, qIdx, answerIndex }`          | Submit an answer     |
| `send:chat`    | `{ gameId, userId, message }`                    | Send a lobby message |

### Server → Client

| Event             | Payload                                               | Description              |
|-------------------|-------------------------------------------------------|--------------------------|
| `game:lobby`      | `{ gameId, playerCount, pot, chatMessages[] }`        | Lobby state on join      |
| `game:countdown`  | `{ gameId, seconds }`                                 | Countdown before start   |
| `game:question`   | `{ gameId, qIdx, question, options[] }`               | New question             |
| `answer:result`   | `{ gameId, qIdx, correct, correctIndex }`             | Your answer result       |
| `game:reveal`     | `{ gameId, correctIndex, counts[], eliminated[] }`    | Question reveal          |
| `game:finish`     | `{ gameId, winner, prize }`                           | Game over                |
| `lobby:chat`      | `{ user, message, timestamp }`                        | Chat message             |
| `pot:update`      | `{ gameId, pot }`                                     | Pot amount update        |
| `error`           | `{ message, code? }`                                  | Error event              |

---

## Business Logic

### Lives System
- Users get **3 lives per day**, reset at midnight Peru time (America/Lima)
- Free games (entryFee = 0) cost **1 life** per entry
- VIP games (entryFee > 0) cost **entry fee in soles** from user balance

### Pot Calculation
- **VIP games**: `currentPot = entryFee × numberOfPlayers`
- **Free games**: fixed prize amount

### Withdrawal Rules
| Method | Fee | Processing Time |
|--------|-----|-----------------|
| Yape   | Free | Instant        |
| Plin   | Free | Instant        |
| Bank   | S/2 | 24–48 hours    |

Minimum withdrawal: **S/20**

---

## Development Scripts

```bash
npm run dev              # Start dev server with hot reload
npm run build            # Compile TypeScript
npm run start            # Run compiled build
npm run prisma:migrate   # Run database migrations (dev)
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:studio    # Open Prisma Studio (DB GUI)
npm run seed             # Seed the database
```

## Migration Commands Reference

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

# 2. Run migrations (creates tables)
npx prisma migrate deploy

# OR for development (creates and tracks migrations)
npx prisma migrate dev --name init

# 3. Generate Prisma client
npx prisma generate

# 4. Seed the database
npm run seed

# 5. Start development server
npm run dev
```

---

## Project Structure

```
src/
├── index.ts              Express app + Socket.IO server entry
├── config.ts             Env-based configuration
├── middleware/
│   ├── auth.ts           JWT authentication + admin guard
│   └── errorHandler.ts   Global error handler + AppError class
├── routes/               Route definitions (thin layer)
├── controllers/          Request handlers + Zod validation
├── services/             Business logic
│   ├── auth.service.ts   User registration, login, JWT
│   ├── game.service.ts   Game lifecycle, lives, pot, answers
│   └── withdrawal.service.ts  Withdrawal request + status
├── socket/
│   └── gameSocket.ts     Socket.IO live game event handlers
└── types/
    └── index.ts          Shared TypeScript types
```
