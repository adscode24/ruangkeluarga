import { requireUser, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') return fail(res, Object.assign(new Error('Akses ditolak'), { status: 403 }));
    const body = await readBody(req);
    const fid = body.family_id;
    if (!fid) return fail(res, Object.assign(new Error('family_id wajib diisi'), { status: 400 }));
    const admin = adminClient();
    for (const tbl of ['room_messages', 'direct_messages', 'family_tasks', 'family_contracts', 'point_transactions', 'family_schedules', 'family_invitations', 'family_rooms', 'furniture', 'screen_time_limits', 'screen_time_sessions', 'device_reports', 'notifications', 'subscriptions']) {
      await admin.from(tbl).delete().eq('family_id', fid);
    }
    await admin.from('family_members').delete().eq('family_id', fid);
    await admin.from('profiles').update({ family_id: null }).eq('family_id', fid);
    await admin.from('families').delete().eq('id', fid);
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
