# MIGRATION (Base44 → Vercel+Supabase)

| Base44 | Pengganti |
|---|---|
| `User{role,family_id}` | `auth.users` + `profiles` (trigger `handle_new_user`) |
| 17 entities + RLS `data.family_id=user.data.family_id` | 17 tabel + `rls.sql` (`family_id=my_family_id()`) |
| `entities.X.filter/create/update/delete/subscribe` | `src/api/entities.js` (Supabase / demoStore) + Realtime |
| 35 `functions/entry.ts` (`createClientFromRequest`, `asServiceRole`) | `api/functions/*.js` (`requireUser/requireMember`, `adminClient`) |
| `auth.me/updateMe/logout/redirectToLogin/loginViaEmailPassword…` | `src/api/auth.js` (supabase.auth + alias kompatibel) |
| `integrations.Core.SendEmail/SendPush/InvokeLLM`, `users.inviteUser` | stub aman frontend + OpenAI asli di backend; email/push bisa pasang Resend/FCM nanti |
| `workflows` (OnTaskAssigned, OnMessage, AutoFamilyMode) | pemanggilan `notify*` langsung di fungsi + Vercel Cron |
| `@base44/sdk`, `@base44/vite-plugin` | dihapus; `@supabase/supabase-js`, `stripe`, `openai` |
| `VITE_BASE44_*` | `VITE_SUPABASE_*` + `SUPABASE_*` (lihat `.env.example`) |

Frontend: 92 pemakaian `base44.*` tetap jalan via shim `src/api/base44Client.js`
— hanya `AuthContext` + `app-params` yang ditulis ulang; halaman lain tanpa ubah logika.
Perbedaan perilaku: OTP Base44 → link email Supabase; `created_date` dipetakan dari `created_at`.
