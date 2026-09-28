import { supabase } from './supabaseClient';

// Auth murni Supabase — tanpa pola Base44.
export const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw Object.assign(new Error('Belum login'), { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
      role: profile?.role || 'user',
      family_id: profile?.family_id || null,
      last_active: profile?.last_active || null,
    };
  },

  async updateMe(patch = {}) {
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  },

  async register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    return data.user;
  },

  async loginWithProvider(provider, returnTo) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo: returnTo || window.location.origin },
    });
    if (error) throw new Error(error.message);
  },

  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  async resetPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  async logout() {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  redirectToLogin(returnTo) {
    if (typeof window !== 'undefined') {
      const next = returnTo || window.location.href;
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    }
  },
};
