import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { notifyMember } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const memberId = body.member_id;
    const points = parseInt(body.points, 10);
    const description = String(body.description || 'Bonus').trim();
    if (!memberId || !points || points <= 0 || points > 1000) {
      return fail(res, Object.assign(new Error('Poin tidak valid (1-1000)'), { status: 400 }));
    }
    const role = myMember.family_role;
    const canBonus = role === 'ayah' || role === 'ibu' || role === 'kakek' || role === 'nenek';
    if (!canBonus) return fail(res, Object.assign(new Error('Tidak diizinkan memberi bonus'), { status: 403 }));
    if ((role === 'kakek' || role === 'nenek') && points > 50) {
      return fail(res, Object.assign(new Error('Kakek/Nenek maksimal 50 poin'), { status: 403 }));
    }
    const { data: t } = await admin.from('family_members').select('*').eq('id', memberId).limit(1);
    const target = (t || [])[0];
    if (!target || target.family_id !== myMember.family_id) {
      return fail(res, Object.assign(new Error('Anggota tidak ditemukan'), { status: 404 }));
    }
    await admin.from('family_members').update({ points_balance: (target.points_balance || 0) + points }).eq('id', memberId);
    const { data: txn } = await admin.from('point_transactions').insert({
      family_id: myMember.family_id, member_id: memberId, user_id: target.user_id,
      user_name: target.full_name, type: 'bonus', points, description, status: 'completed',
      approved_by_id: myMember.id, approved_by_name: myMember.full_name,
    }).select().single();
    await notifyMember(admin, myMember.family_id, target.user_id, 'Bonus Poin!', `+${points} poin: ${description}`, 'points_earned', txn?.id);
    return ok(res, { success: true, transaction_id: txn?.id });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
