# QTriviaPeru

Live trivia platform for Peru. Monorepo with three independently-installed apps — no workspace root.

## Structure

```
api/      Express + TypeScript + Prisma (PostgreSQL) — game engine, REST + Socket.IO
admin/    Vite + React + TypeScript — backoffice
mobile/   Expo (React Native) — player app
mediamtx/ MediaMTX v1.19.0 binary + config — RTMP/HLS streaming server
```

## Commands

Each app needs its own `cd` + install; there's no root workspace.

**API** (port 3002)
```bash
cd api
npm install
npx prisma generate
npx prisma migrate deploy   # production
npx prisma migrate dev      # local dev
npm run dev                 # ts-node-dev watch
npm run build && npm start  # production (PM2)
```

**Admin** (port 5173 dev, built to `admin/dist/`)
```bash
cd admin
npm install
npm run dev
npm run build
```

**Mobile**
```bash
cd mobile
npm install
npx expo start
npx expo build              # EAS build
```

No test suites exist in any of the three apps.

## Environment

- `api/.env` — never committed; copy from `api/.env.example`
- `admin/.env` — never committed; copy from `admin/.env.example` (`VITE_API_URL=http://...`)
- `mobile/.env` — never committed; `EXPO_PUBLIC_API_URL=http://...`
- Production server: DigitalOcean SFO3, `137.184.227.167`, port 3002
- Timezone: **`America/Lima`** (UTC-5, no DST) — lives reset and leaderboard boundaries depend on this

## API Architecture

`routes/` → `controllers/` → `services/` thin layering. Prisma client is the only ORM.

**Permissions**: empty `permissions: []` array on a user = superadmin (can do everything). Non-empty = explicit whitelist.

**Live game flow** (core of the product):
- `src/socket/gameSocket.ts` holds in-memory `activeGames` Map — source of truth for a running game
- Modes: `hosted` (admin advances questions manually) vs `autoPlay` (scheduler advances automatically)
- Per-question cycle: emit `question:start` → collect answers → emit `question:reveal` (with double-reveal guard) → eliminate wrong answerers → check lives → advance or end
- `src/services/gameScheduler.ts` runs every 60s to auto-start scheduled games

**HLS streaming proxy** (`src/routes/games.ts`):
- `/api/games/stream/hls/*` proxies to MediaMTX `:8888`
- Server-side `hlsSessionCache` stores the MediaMTX `hlsSession` cookie per stream key
- `stripLLHLS()` removes `#EXT-X-PART-INF` and `CAN-BLOCK-RELOAD` from m3u8 — expo-video freezes on LL-HLS

**Money rule**: all balance changes go through `BalanceLedger` — never update `User.balance` directly.

## Admin

- `src/api/client.ts` — axios instance; base URL from `VITE_API_URL`
- `src/pages/LiveMonitor.tsx` — Socket.IO connection to API for real-time game monitoring
- All UI copy is in Spanish

## Mobile

- `src/components/YouTubePlayer.tsx` — HLS video player; `hasPlayedRef` pattern for stall detection + `replaceAsync` reload
- All UI copy is in Spanish
- Types are hand-shared with API (no codegen)

## MediaMTX

- Config: `mediamtx/mediamtx.yml`
- `authInternalUsers: [{user: any, ips: [], permissions: [publish, read, playback]}]` — allows any streamer
- Do **not** add `pass: any` — unsupported and breaks auth
- RTMP publish: `rtmp://server:1935/live/<streamKey>`
- HLS playback: via API proxy, not direct to MediaMTX port

## Git hygiene

`api/.env`, `admin/.env`, `mobile/.env`, `dist/`, `node_modules/`, `.expo/` are all gitignored.
`*.env.example` files are committed and serve as templates.
