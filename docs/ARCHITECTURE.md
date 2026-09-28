# ARCHITECTURE & ROUTING

## Arsitektur
```
Browser (Vite React)
  ├─ src/api/base44Client.js  (shim kompatibel: entities/functions/auth)
  ├─ src/api/entities.js      → Supabase tabel / demoStore
  ├─ src/api/functions.js     → fetch POST /api/functions/:name (JWT Supabase)
  └─ src/api/auth.js          → supabase.auth (+ mode demo)
Vercel Serverless (/api)
  ├─ _lib/supabase.js         → adminClient (service_role)
  ├─ _lib/auth.js             → requireUser/requireMember (verifikasi Bearer)
  ├─ _lib/helpers.js          → role/permission/notifikasi (port familyHelpers)
  ├─ functions/*.js           → 35 fungsi bisnis
  ├─ webhooks/stripe.js       → sinkronisasi Subscription
  └─ cron/apply-all-family-modes.js → tiap 30 mnt (vercel.json)
Supabase: Auth + Postgres + Realtime. Stripe: Checkout. OpenAI: laporan.
```

## Routing (`src/App.jsx`)
Publik: `/login`, `/register`, `/forgot-password`, `/reset-password`.
Terproteksi (`ProtectedRoute` + `AuthContext` Supabase):
`/onboarding` (buat/gabung keluarga), `/admin` (role=admin),
dalam `AppLayout`: `/` Home, `/room/:roomId`, `/messages[/:userId]`,
`/wallet`, `/family`, `/tasks`, `/contracts`, `/modes`, `/report`,
`/settings`, `/premium`, `/avatar`, `/furniture`, `/screen-time`.

## State
`AuthContext` (session Supabase) → `FamilyContext` (profiles → family_members →
families/rooms + checkSubscription) → React Query per halaman + Supabase Realtime subscribe.
