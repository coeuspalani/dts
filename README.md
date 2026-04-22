# DTS — Dare to Solve

Competitive LeetCode challenge platform. Built with Next.js 14, Supabase, Tailwind, and deployed on Vercel.

## Supabase Project
- **Project:** `dts-platform`
- **URL:** `https://rlzjyniextatlumkcsps.supabase.co`
- **Region:** ap-south-1 (Mumbai)

## Deploy in 5 Steps

### 1. Clone & Install
```bash
unzip dts.zip && cd dts
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env.local
```
Fill in `.env.local`:

| Variable | Where to get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` key |
| `JWT_SECRET` | run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `SYNC_SECRET` | run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | your Vercel URL after first deploy |

### 3. Test Locally
```bash
npm run dev
# open http://localhost:3000
```

### 4. Deploy to Vercel
```bash
npm i -g vercel
vercel --prod
```
Add all env vars in Vercel dashboard → Project → Settings → Environment Variables.

### 5. Admin Account
The seeded admin is `admin@dts.io`. After deploying, update the password via Supabase dashboard:
```sql
-- Run in Supabase SQL editor
-- First generate a hash using your app, then update:
UPDATE users SET password_hash = '<new_hash>' WHERE email = 'admin@dts.io';
```
Or register normally and manually set `role = 'admin'` in Supabase Table Editor.

---

## Project Structure

```
dts/
├── app/
│   ├── api/                  ← All backend API routes
│   │   ├── auth/             ← register, login, refresh, logout
│   │   ├── users/            ← me, [id]
│   │   ├── challenges/       ← CRUD + join
│   │   ├── leaderboard/      ← global + per-challenge
│   │   ├── sync/             ← LeetCode sync + cron
│   │   └── admin/            ← stats, users
│   ├── login/                ← Login + register page
│   ├── dashboard/            ← Main dashboard
│   ├── leaderboard/          ← Full leaderboard
│   └── admin/                ← Admin panel
│
├── components/               ← Reusable UI
│   ├── AppShell.tsx          ← Auth guard + layout
│   ├── Sidebar.tsx
│   ├── StatCard.tsx
│   ├── ChallengeCard.tsx
│   ├── LeaderboardTable.tsx
│   ├── CountdownTimer.tsx
│   └── Toast.tsx
│
├── lib/
│   ├── supabase.ts           ← Supabase clients (anon + admin)
│   ├── auth.ts               ← JWT + PBKDF2 password hashing
│   ├── leetcode.ts           ← LeetCode GraphQL fetcher
│   ├── middleware.ts          ← API helpers (getUser, ok, forbidden...)
│   ├── api-client.ts         ← Frontend fetch with auto token refresh
│   └── types.ts              ← Shared TypeScript interfaces
│
├── hooks/
│   └── useAuth.ts            ← Auth state + localStorage persistence
│
├── vercel.json               ← Cron: sync every 5 min
└── .env.example
```

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register + validate LeetCode |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/refresh` | — | Rotate tokens |
| POST | `/api/auth/logout` | — | Revoke token |
| GET | `/api/users/me` | 🔒 | Own profile |
| PATCH | `/api/users/me` | 🔒 | Update name |
| GET | `/api/users/[id]` | — | Public user stats |
| GET | `/api/leaderboard` | — | Global or challenge leaderboard |
| GET | `/api/challenges` | — | List challenges |
| POST | `/api/challenges` | 👑 | Create challenge |
| PATCH | `/api/challenges/[id]` | 👑 | Update status/dates |
| DELETE | `/api/challenges/[id]` | 👑 | Delete challenge |
| POST | `/api/challenges/[id]/join` | 🔒 | Join challenge |
| POST | `/api/sync` | 🔒 | Sync LeetCode stats |
| GET | `/api/admin/stats` | 👑 | Dashboard counts |
| GET | `/api/admin/users` | 👑 | All users |

🔒 = Bearer token · 👑 = Admin role

## Points System
| Difficulty | Points |
|---|---|
| Easy | 1 |
| Medium | 2 |
| Hard | 3 |

## Auto-Sync
`vercel.json` runs a cron every 5 minutes hitting `GET /api/sync` with `X-Sync-Secret` header. All users' LeetCode stats are fetched and rankings are recalculated automatically.
