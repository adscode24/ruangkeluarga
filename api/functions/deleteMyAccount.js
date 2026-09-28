import { requireUser, ok, fail, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const user = await requireUser(req);
    const admin = adminClient();
    const { data: myMembers } = await admin.from('family_members').select('*').eq('user_id', user.id);
    const memberIds = (myMembers || []).map((m) => m.id);

    await admin.from('family_members').delete().eq('user_id', user.id);
    await admin.from('direct_messages').delete().eq('sender_id', user.id);
    await admin.from('direct_messages').delete().eq('receiver_id', user.id);
    await admin.from('room_messages').delete().eq('sender_id', user.id);
    await admin.from('notifications').delete().eq('user_id', user.id);
    await admin.from('point_transactions').delete().eq('user_id', user.id);
    for (const mid of memberIds) {
      await admin.from('screen_time_sessions').delete().eq('member_id', mid);
      await admin.from('screen_time_limits').delete().eq('member_id', mid);
      await admin.from('family_tasks').delete().eq('assigned_to_id', mid);
    }
    if (user.email) await admin.from('family_invitations').delete().eq('email', String(user.email).toLowerCase());
    // Hapus user auth (best-effort)
    try { await admin.auth.admin.deleteUser(user.id); } catch { /* ignore */ }
    return ok(res, { success: true, deleted_members: memberIds.length });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
