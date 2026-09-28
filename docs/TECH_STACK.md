# TECH_STACK — Ruang Keluarga (Vercel)

## Frontend
Vite 6, React 18, react-router-dom 6, Tailwind 3.4 + tailwindcss-animate,
shadcn/ui (Radix), @tanstack/react-query, react-hook-form + zod,
framer-motion, recharts, react-leaflet, three, jspdf + html2canvas,
canvas-confetti, sonner/react-hot-toast, next-themes, lucide-react.

## Backend
- **Runtime:** Vercel Serverless Functions (Node 20, ESM, maxDuration 30).
- **Auth+DB:** Supabase — `auth.users` + tabel `profiles`, 16 tabel domain (lihat DATA_MODEL).
- **Realtime:** Supabase postgres_changes (pengganti `base44.entities.X.subscribe`).
- **Fail-safe demo:** `src/api/demoStore.js` (localStorage) aktif saat env kosong → build/preview tetap zero-error.

## Eksternal
| Layanan | Env | Wajib? |
|---|---|---|
| Supabase URL+anon (frontend) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Ya (produksi) |
| Supabase service_role (backend) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Ya |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY/YEARLY` | Opsional (Premium) |
| OpenAI | `OPENAI_API_KEY` | Opsional (AI fallback template) |

## Perintah
`npm run dev|build|preview|lint`. Output `dist/` (lihat `vercel.json`).
