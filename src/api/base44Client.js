// Shim kompatibel Base44 — agar 92 pemakaian `base44.entities/functions/auth`
// di src/pages & src/components tetap jalan TANPA ubah UI.
// Backend baru: Supabase (jika env diisi) atau demoStore lokal (jika belum).
import { getEntity, ENTITY_TABLE } from './entities';
import { invokeFunction } from './functions';
import { auth } from './auth';
import { supabase } from './supabaseClient';

const entityProxy = new Proxy({}, {
  get(_t, entityName) {
    if (typeof entityName !== 'string') return undefined;
    return getEntity(entityName);
  },
});

export const base44 = {
  entities: entityProxy,
  functions: { invoke: invokeFunction },
  auth,
  // Kompat: sebagian function lama memakai base44.asServiceRole / integrations / users.
  // Di frontend baru, semuanya lewat /api/functions (server pakai service_role).
  asServiceRole: { entities: entityProxy },
  integrations: {
    Core: {
      async SendEmail() { return { success: true, skipped: true }; },
      async SendPushNotification() { return { success: true, skipped: true }; },
      async UploadFile({ file } = {}) {
        // Supabase Storage (bucket `avatars`) jika dikonfigurasi, else data-URL lokal.
        try {
          const sb = supabase;
          if (sb) {
            const ext = file?.name?.split('.').pop() || 'png';
            const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
            if (!error) {
              const { data } = sb.storage.from('avatars').getPublicUrl(path);
              if (data?.publicUrl) return { file_url: data.publicUrl };
            }
          }
        } catch { /* fallback */ }
        if (file && typeof URL !== 'undefined' && URL.createObjectURL) {
          return { file_url: URL.createObjectURL(file) };
        }
        return { file_url: '' };
      },
      async InvokeLLM() {
        return { headline: 'Mode demo', highlights: [], balance_notes: '-', suggestion: '-' };
      },
    },
  },
  users: {
    async inviteUser() { return { success: true, skipped: true }; },
  },
  _tables: ENTITY_TABLE,
  _supabase: supabase,
};

export default base44;
