# Ruang Keluarga — Rumah Digital Keluarga
Versi Vercel + Supabase. Migrasi penuh dari Base44 (tanpa vendor lock-in).

## Fitur
Tugas & poin, redeem screen-time/uang, screen-time limit & sesi, chat per ruang + DM,
kontrak keluarga, mode jadwal otomatis (sekolah/ramadan/libur/belajar), laporan mingguan AI,
rumah virtual 2D/3D + toko furnitur, lokasi anggota, premium Stripe, admin dashboard.

## Tech stack
| Lapisan | Teknologi |
|---|---|
| Frontend | Vite 6 + React 18 + Router 6, Tailwind 3.4 + shadcn/Radix, React Query, Framer Motion, Recharts, Leaflet, Three.js |
| Auth & DB | Supabase (Postgres + Auth + Realtime). Mode demo localStorage jika env kosong |
| Backend | Vercel Serverless (`/api/functions/*`, `/api/webhooks/stripe`, `/api/cron/*`) |
| Pembayaran | Stripe Checkout + Webhook |
| AI | OpenAI `gpt-4o-mini` (fallback template jika tanpa key) |

## Mulai cepat
```bash
npm install
cp .env.example .env   # isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

## Supabase setup (10 menit)
1. Buat project di supabase.com → ambil URL + anon key + service_role key.
2. SQL Editor → jalankan `supabase/schema.sql`, lalu `supabase/rls.sql`.
3. Authentication → aktifkan Email + Google (opsional). Tambahkan Redirect URL:
   `http://localhost:5173`, `https://<app>-mu.vercel.app`.
4. Trigger auto-profile sudah termasuk di schema (`handle_new_user`).

## Deploy Vercel
1. Push repo ini ke GitHub → Import di vercel.com → framework Vite, output `dist`.
2. Environment Variables (Production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   (opsional: `STRIPE_*`, `OPENAI_API_KEY`, `VITE_APP_URL`).
3. Deploy. Tes: register → buat keluarga → undang via kode → tugas → redeem.
4. Stripe webhook: `https://<app>.vercel.app/api/webhooks/stripe` → event
   `checkout.session.completed`, `customer.subscription.updated/deleted`.
5. Cron otomatis `/api/cron/apply-all-family-modes` tiap 30 menit (lihat `vercel.json`).

## Struktur
```
src/api/            # supabaseClient, entities, functions, auth, base44Client (shim)
src/pages|components|lib/
api/functions/      # 35 fungsi (port Base44 entry.ts)
api/webhooks/stripe.js
api/cron/apply-all-family-modes.js
api/_lib/           # supabase admin, auth JWT, helpers+notifikasi
supabase/           # schema.sql, rls.sql, seed.sql
docs/               # TECH_STACK, ARCHITECTURE, DATA_MODEL, BUSINESS_FLOW, API_DOCS, MIGRATION, DEPLOY_VERCEL
```

## Mode demo
Tanpa env Supabase, aplikasi tetap build & jalan memakai localStorage
(`src/api/demoStore.js`). Cocok untuk preview Vercel sebelum DB siap.

## Dokumen
`docs/TECH_STACK.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`,
`docs/BUSINESS_FLOW.md`, `docs/API_DOCS.md`, `docs/MIGRATION.md`, `docs/DEPLOY_VERCEL.md`.
