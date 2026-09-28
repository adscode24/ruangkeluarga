import { requireUser, ok, fail, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

async function handler(req, res) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') return fail(res, Object.assign(new Error('Akses ditolak — khusus Super Admin'), { status: 403 }));
    const admin = adminClient();
    const [{ data: families }, { data: members }, { data: subscriptions }, { data: users }] = await Promise.all([
      admin.from('families').select('*').order('created_at', { ascending: false }).limit(1000),
      admin.from('family_members').select('*').order('created_at', { ascending: false }).limit(2000),
      admin.from('subscriptions').select('*').limit(1000),
      admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(2000),
    ]);
    const now = Date.now();
    const isOnline = (ts) => ts && (now - new Date(ts).getTime()) < 5 * 60 * 1000;

    const familyRows = (families || []).map((f) => {
      const famMembers = (members || []).filter((m) => m.family_id === f.id);
      const sub = (subscriptions || []).find((s) => s.family_id === f.id);
      const founderMember = famMembers.find((m) => m.is_founder);
      const founderUser = founderMember ? (users || []).find((u) => u.id === founderMember.user_id) : null;
      return {
        id: f.id, name: f.family_name, created_date: f.created_at,
        member_count: famMembers.length, plan: sub?.plan || 'free', status: sub?.status || 'active',
        founder: founderMember?.full_name || '-', founder_email: founderUser?.email || '-',
        founder_last_active: founderUser?.last_active || null,
        founder_is_online: isOnline(founderUser?.last_active),
        members: famMembers.map((m) => {
          const u = (users || []).find((x) => x.id === m.user_id);
          return { id: m.id, user_id: m.user_id, full_name: m.full_name || u?.full_name || '-', email: u?.email || '-', family_role: m.family_role, is_founder: m.is_founder, last_active: u?.last_active || null, is_online: isOnline(u?.last_active) };
        }),
      };
    });
    const premiumCount = familyRows.filter((f) => f.plan !== 'free' && f.status === 'active').length;
    return ok(res, {
      totals: { families: (families || []).length, members: (users || []).length, premium: premiumCount, free: (families || []).length - premiumCount },
      families: familyRows,
      allUsers: (users || []).map((u) => {
        const member = (members || []).find((m) => m.user_id === u.id);
        const family = member ? (families || []).find((f) => f.id === member.family_id) : null;
        return { id: u.id, full_name: member?.full_name || u.full_name || '-', email: u.email || '-', role: u.role, family_id: u.family_id, family_name: family?.family_name || null, family_role: member?.family_role || null, last_active: u.last_active, is_online: isOnline(u.last_active) };
      }),
    });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
