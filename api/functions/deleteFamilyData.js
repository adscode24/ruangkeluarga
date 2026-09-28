import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { user, member: myMember, admin } = await requireMember(req);
    if (!myMember.is_founder) {
      return fail(res, Object.assign(new Error('Hanya founder keluarga yang dapat menghapus data'), { status: 403 }));
    }
    const body = await readBody(req);
    const confirm = String(body.confirm || '').trim();
    const fid = myMember.family_id;
    const { data: fam } = await admin.from('families').select('*').eq('id', fid).limit(1);
    const family = (fam || [])[0];
    if (!family) return fail(res, Object.assign(new Error('Keluarga tidak ditemukan'), { status: 404 }));
    if (confirm !== family.family_name) {
      return fail(res, Object.assign(new Error('Konfirmasi nama keluarga tidak cocok'), { status: 400 }));
    }
    const { data: members } = await admin.from('family_members').select('user_id').eq('family_id', fid);
    const userIds = [...new Set((members || []).map((m) => m.user_id).filter(Boolean))];

    for (const tbl of ['room_messages', 'direct_messages', 'family_tasks', 'family_contracts', 'point_transactions', 'family_schedules', 'family_invitations', 'family_rooms', 'furniture', 'screen_time_limits', 'screen_time_sessions', 'device_reports', 'notifications', 'subscriptions']) {
      await admin.from(tbl).delete().eq('family_id', fid);
    }
    await admin.from('family_members').delete().eq('family_id', fid);
    for (const uid of userIds) {
      await admin.from('profiles').update({ family_id: null }).eq('id', uid);
    }
    await admin.from('families').delete().eq('id', fid);
    await admin.from('profiles').update({ family_id: null }).eq('id', user.id);
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
