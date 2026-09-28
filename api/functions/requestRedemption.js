import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { notifyParents } from '../../_lib/helpers.js';

const POINT_TO_RUPIAH = 100;

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { user, member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const points = parseInt(body.points, 10);
    const redemptionType = body.type;
    const description = String(body.description || '').trim();
    if (!points || points <= 0) return fail(res, Object.assign(new Error('Jumlah poin tidak valid'), { status: 400 }));
    if (!['redeemed_for_screen_time', 'redeemed_for_cash'].includes(redemptionType)) {
      return fail(res, Object.assign(new Error('Tipe penukaran tidak valid'), { status: 400 }));
    }
    if (myMember.family_role !== 'kakak' && myMember.family_role !== 'adik') {
      return fail(res, Object.assign(new Error('Hanya anak yang dapat menukarkan poin'), { status: 403 }));
    }
    if ((myMember.points_balance || 0) < points) {
      return fail(res, Object.assign(new Error('Saldo poin tidak cukup'), { status: 400 }));
    }
    const cashAmount = redemptionType === 'redeemed_for_cash' ? points * POINT_TO_RUPIAH : null;
    const defaultDesc = redemptionType === 'redeemed_for_cash'
      ? `Tukar ${points} poin menjadi Rp ${(cashAmount || 0).toLocaleString('id-ID')}`
      : `Tukar ${points} poin menjadi waktu layar`;

    await admin.from('family_members').update({ points_balance: (myMember.points_balance || 0) - points }).eq('id', myMember.id);
    const { data: txn, error } = await admin.from('point_transactions').insert({
      family_id: myMember.family_id, member_id: myMember.id, user_id: user.id,
      user_name: myMember.full_name, type: redemptionType, points: -points,
      description: description || defaultDesc, status: 'pending', cash_amount: cashAmount,
    }).select().single();
    if (error) throw new Error(error.message);
    await notifyParents(admin, myMember.family_id, 'Permintaan Penukaran Poin',
      `${myMember.full_name} ingin menukar ${points} poin${cashAmount ? ` menjadi Rp ${cashAmount.toLocaleString('id-ID')}` : ' untuk waktu layar'}`,
      'redemption_requested', txn.id);
    return ok(res, { success: true, transaction_id: txn.id });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
