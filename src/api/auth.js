import { supabase, isSupabaseConfigured } from './supabaseClient';

// Auth kompatibel Base44: me(), updateMe(), logout(), redirectToLogin()
// Mode demo: user lokal di localStorage agar UI bisa dijelajah tanpa backend.
const DEMO_KEY = 'rk_demo_user';

function demoUser() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export const auth = {
  async me() {
    if (!isSupabaseConfigured || !supabase) {
      const u = demoUser();
      if (!u) throw Object.assign(new Error('Belum login (mode demo)'), { status: 401 });
      return u;
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw Object.assign(new Error('Belum login'), { status: 401 });
    // Profil app ada di tabel profiles (lihat supabase/schema.sql)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
      role: profile?.role || 'user',
      family_id: profile?.family_id || '',
      last_active: profile?.last_active || null,
    };
  },

  async updateMe(patch = {}) {
    if (!isSupabaseConfigured || !supabase) {
      const u = demoUser() || {};
      const next = { ...u, ...patch };
      localStorage.setItem(DEMO_KEY, JSON.stringify(next));
      return next;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Belum login');
    const allowed = {};
    if (patch.family_id !== undefined) allowed.family_id = patch.family_id;
    if (patch.full_name !== undefined) allowed.full_name = patch.full_name;
    if (patch.last_active !== undefined) allowed.last_active = patch.last_active;
    if (Object.keys(allowed).length) {
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, ...allowed }, { onConflict: 'id' });
    }
    return this.me();
  },

  async login(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      const u = { id: 'demo-user', email, full_name: email.split('@')[0], role: 'user', family_id: '' };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      return u;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  },

  async register(email, password, fullName) {
    if (!isSupabaseConfigured || !supabase) {
      const u = { id: 'demo-user', email, full_name: fullName || email.split('@')[0], role: 'user', family_id: '' };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      return u;
    }
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    return data.user;
  },

  logout(redirectTo) {
    if (!isSupabaseConfigured || !supabase) {
      localStorage.removeItem(DEMO_KEY);
      if (redirectTo && typeof window !== 'undefined') window.location.href = '/login';
      return;
    }
    supabase.auth.signOut().finally(() => {
      if (redirectTo && typeof window !== 'undefined') window.location.href = '/login';
    });
  },

  redirectToLogin(returnTo) {
    if (typeof window !== 'undefined') {
      const next = returnTo || window.location.href;
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    }
  },

  // ===== Alias kompatibel Base44 (dipakai halaman lama) =====
  async loginViaEmailPassword(email, password) {
    return this.login(email, password);
  },
  async loginWithProvider(provider, returnTo) {
    if (!isSupabaseConfigured || !supabase) {
      // Demo: langsung buat user demo
      const u = { id: 'demo-user', email: 'demo@ruangkeluarga.id', full_name: 'Demo', role: 'user', family_id: '' };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      if (typeof window !== 'undefined') window.location.href = returnTo || '/';
      return u;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo: returnTo || (typeof window !== 'undefined' ? window.location.origin : undefined) },
    });
    if (error) throw new Error(error.message);
  },
  async register(payload) {
    const email = typeof payload === 'string' ? payload : payload.email;
    const password = typeof payload === 'string' ? arguments[1] : payload.password;
    const fullName = payload?.full_name || payload?.fullName || email?.split('@')[0];
    return this.register(email, password, fullName);
  },
  async verifyOtp() {
    // Supabase memakai link email, bukan OTP 6-digit. Anggap sukses agar flow lama tidak crash.
    return { access_token: null };
  },
  async resendOtp() { return { success: true }; },
  setToken() { /* no-op: Supabase memakai httpOnly session */ },
  async forgotPassword(email) {
    if (!isSupabaseConfigured || !supabase) return { success: true };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  async resetPasswordRequest(email) {
    return this.forgotPassword(typeof email === 'string' ? email : email?.email);
  },
  async resetPassword(arg) {
    const newPassword = typeof arg === 'string' ? arg : arg?.newPassword || arg?.password;
    if (!newPassword) throw new Error('Password baru wajib diisi');
    if (!isSupabaseConfigured || !supabase) return { success: true };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  },
};
