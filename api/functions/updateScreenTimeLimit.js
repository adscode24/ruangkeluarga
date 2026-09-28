import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { isParent, todayISO } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const memberId = body.member_id;
    const dailyLimit = parseInt(body.daily_limit_minutes, 10);
    if (!memberId) return fail(res, Object.assign(new Error('ID anggota wajib diisi'), { status: 400 }));
    if (isNaN(dailyLimit) || dailyLimit < 0 || dailyLimit > 1440) {
      return fail(res, Object.assign(new Error('Batas harian tidak valid (0-1440 menit)'), { status: 400 }));
    }
    if (!isParent(myMember.family_role)) {
      return fail(res, Object.assign(new Error('Hanya orang tua yang dapat mengatur batas screen time'), { status: 403 }));
    }
    const { data: c } = await admin.from('family_members').select('*').eq('id', memberId).limit(1);
    const child = (c || [])[0];
    if (!child) return fail(res, Object.assign(new Error('Anak tidak ditemukan'), { status: 404 }));
    if (child.family_id !== myMember.family_id) return fail(res, Object.assign(new Error('Tidak diizinkan'), { status: 403 }));

    const { data: ex } = await admin.from('screen_time_limits').select('*').eq('member_id', memberId).limit(1);
    if (ex?.[0]) {
      const { data: updated } = await admin.from('screen_time_limits').update({
        daily_limit_minutes: dailyLimit, set_by_name: myMember.full_name,
      }).eq('id', ex[0].id).select().single();
      return ok(res, { success: true, limit: updated });
    }
    const { data: limit, error } = await admin.from('screen_time_limits').insert({
      family_id: myMember.family_id, member_id: memberId, member_name: child.full_name,
      daily_limit_minutes: dailyLimit, used_today_minutes: 0, last_reset_date: todayISO(),
      bonus_minutes: 0, is_locked: false, set_by_name: myMember.full_name,
    }).select().single();
    if (error) throw new Error(error.message);
    return ok(res, { success: true, limit });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
