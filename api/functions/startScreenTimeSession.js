import { requireMember, ok, fail, withCors } from '../../_lib/auth.js';
import { todayISO } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    if (myMember.family_role !== 'kakak' && myMember.family_role !== 'adik') {
      return fail(res, Object.assign(new Error('Hanya anak yang dapat memulai sesi screen time'), { status: 403 }));
    }
    const { data: active } = await admin.from('screen_time_sessions').select('*').eq('member_id', myMember.id).eq('status', 'active').limit(1);
    if (active?.length) return fail(res, Object.assign(new Error('Anda masih memiliki sesi aktif'), { status: 400 }));

    const today = todayISO();
    const { data: lim } = await admin.from('screen_time_limits').select('*').eq('member_id', myMember.id).limit(1);
    let limit = (lim || [])[0];
    if (!limit) {
      const { data: created } = await admin.from('screen_time_limits').insert({
        family_id: myMember.family_id, member_id: myMember.id, member_name: myMember.full_name,
        daily_limit_minutes: 120, used_today_minutes: 0, last_reset_date: today,
        bonus_minutes: 0, is_locked: false, set_by_name: 'Sistem',
      }).select().single();
      limit = created;
    }
    if (limit.last_reset_date !== today) {
      const { data: reset } = await admin.from('screen_time_limits').update({
        used_today_minutes: 0, last_reset_date: today, is_locked: false,
      }).eq('id', limit.id).select().single();
      limit = reset;
    }
    const totalAllowed = (limit.daily_limit_minutes || 0) + (limit.bonus_minutes || 0);
    const remaining = totalAllowed - (limit.used_today_minutes || 0);
    if (remaining <= 0) {
      await admin.from('screen_time_limits').update({ is_locked: true }).eq('id', limit.id);
      return fail(res, Object.assign(new Error('Batas screen time hari ini sudah habis. Tukar poin untuk dapat bonus menit.'), { status: 403 }));
    }
    const { data: session, error } = await admin.from('screen_time_sessions').insert({
      family_id: myMember.family_id, member_id: myMember.id, member_name: myMember.full_name,
      start_time: new Date().toISOString(), status: 'active',
    }).select().single();
    if (error) throw new Error(error.message);
    return ok(res, { success: true, session, remaining_minutes: remaining, limit });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
