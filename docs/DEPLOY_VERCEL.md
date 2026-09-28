# DEPLOY_VERCEL — checklist zero-error

1. **GitHub:** buat repo `ruangkeluarga` → `git init && git add . && git commit -m "migrasi vercel" && git branch -M main && git remote add origin <url> && git push -u origin main`.
2. **Vercel:** Import repo → Framework `Vite` → Build `npm run build` → Output `dist` → Node 20.
3. **Env Production (wajib):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   Opsional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY/YEARLY`,
   `VITE_STRIPE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `VITE_APP_URL=https://<app>.vercel.app`.
4. **Supabase:** jalankan `schema.sql` lalu `rls.sql`; Auth → URL redirect localhost + domain Vercel.
5. **Verifikasi:** `/login` → register → `/onboarding` buat keluarga → `/tasks` → `/wallet` →
   `/screen-time` → `/premium?status` (jika Stripe) → `/admin` (role admin).
6. **Stripe webhook:** tambah endpoint `/api/webhooks/stripe` dengan event yang tercantum di README.
7. **Troubleshooting:** 401 → token expired/login ulang; 500 Supabase belum dikonfigurasi →
   cek service_role; build gagal → `npm run build` lokal; rute 404 → `vercel.json` rewrites.
