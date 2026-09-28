import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const sessionId = body.session_id;
    const forcedByName = body.forced_by_name;
    if (!sessionId) return fail(res, Object.assign(new Error('ID sesi wajib diisi'), { status: 400 }));

    const { data: s } = await admin.from('screen_time_sessions').select('*').eq('id', sessionId).eq('status', 'active').limit(1);
    const session = (s || [])[0];
    if (!session) return fail(res, Object.assign(new Error('Sesi tidak ditemukan atau sudah berakhir'), { status: 404 }));

    const isOwner = session.member_id === myMember.id;
    const isParentUser = myMember.family_role === 'ayah' || myMember.family_role === 'ibu';
    if (!isOwner && !isParentUser) return fail(res, Object.assign(new Error('Tidak diizinkan'), { status: 403 }));
    if (!isOwner && isParentUser && session.family_id !== myMember.family_id) {
      return fail(res, Object.assign(new Error('Tidak diizinkan'), { status: 403 }));
    }
    const now = new Date();
    const durationMinutes = Math.max(1, Math.round((now.getTime() - new Date(session.start_time).getTime()) / 60000));
    await admin.from('screen_time_sessions').update({
      end_time: now.toISOString(), duration_minutes: durationMinutes,
      status: forcedByName ? 'forced_end' : 'ended', ended_by_name: forcedByName || myMember.full_name,
    }).eq('id', sessionId);

    const { data: lim } = await admin.from('screen_time_limits').select('*').eq('member_id', session.member_id).limit(1);
    if (lim?.[0]) {
      const limit = lim[0];
      const newUsed = (limit.used_today_minutes || 0) + durationMinutes;
      const newBonus = Math.max(0, (limit.bonus_minutes || 0) - durationMinutes);
      const totalAllowed = (limit.daily_limit_minutes || 0) + newBonus;
      await admin.from('screen_time_limits').update({
        used_today_minutes: newUsed, bonus_minutes: newBonus, is_locked: newUsed >= totalAllowed,
      }).eq('id', limit.id);
    }
    return ok(res, { success: true, duration_minutes: durationMinutes });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
