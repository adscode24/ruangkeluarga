import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url) console.warn('[api] SUPABASE_URL belum diisi');

export function adminClient() {
  if (!url || !serviceKey) throw new Error('Supabase backend belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function userClient(accessToken) {
  if (!url || !anonKey) throw new Error('Supabase backend belum dikonfigurasi');
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}
