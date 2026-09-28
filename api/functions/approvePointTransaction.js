import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { notifyMember, todayISO } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    if (myMember.family_role !== 'ayah' && myMember.family_role !== 'ibu') {
      return fail(res, Object.assign(new Error('Hanya orang tua yang dapat menyetujui'), { status: 403 }));
    }
    const body = await readBody(req);
    const { transaction_id, action } = body;
    if (!transaction_id || !['approve', 'reject'].includes(action)) {
      return fail(res, Object.assign(new Error('Parameter tidak valid'), { status: 400 }));
    }
    const { data: t } = await admin.from('point_transactions').select('*').eq('id', transaction_id).limit(1);
    const txn = (t || [])[0];
    if (!txn) return fail(res, Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 }));
    if (txn.family_id !== myMember.family_id) return fail(res, Object.assign(new Error('Tidak diizinkan'), { status: 403 }));
    if (txn.status !== 'pending') return fail(res, Object.assign(new Error('Transaksi sudah diproses'), { status: 400 }));

    if (action === 'reject') {
      await admin.from('point_transactions').update({
        status: 'rejected', approved_by_id: myMember.id, approved_by_name: myMember.full_name,
      }).eq('id', transaction_id);
      // refund saldo (hold dikembalikan)
      const { data: m } = await admin.from('family_members').select('*').eq('id', txn.member_id).limit(1);
      if (m?.[0]) await admin.from('family_members').update({ points_balance: (m[0].points_balance || 0) + Math.abs(txn.points) }).eq('id', txn.member_id);
      await notifyMember(admin, myMember.family_id, txn.user_id, 'Penukaran Ditolak', `Penukaran ${Math.abs(txn.points)} poin ditolak`, 'redemption_rejected', transaction_id);
      return ok(res, { success: true, status: 'rejected' });
    }

    await admin.from('point_transactions').update({
      status: 'approved', approved_by_id: myMember.id, approved_by_name: myMember.full_name,
    }).eq('id', transaction_id);

    if (txn.type === 'redeemed_for_screen_time') {
      const bonusMinutes = Math.abs(txn.points) * 5;
      const { data: lim } = await admin.from('screen_time_limits').select('*').eq('member_id', txn.member_id).limit(1);
      if (lim?.[0]) {
        await admin.from('screen_time_limits').update({
          bonus_minutes: (lim[0].bonus_minutes || 0) + bonusMinutes, is_locked: false,
        }).eq('id', lim[0].id);
      } else {
        const { data: mem } = await admin.from('family_members').select('*').eq('id', txn.member_id).limit(1);
        await admin.from('screen_time_limits').insert({
          family_id: myMember.family_id, member_id: txn.member_id, member_name: mem?.[0]?.full_name || txn.user_name,
          daily_limit_minutes: 120, used_today_minutes: 0, last_reset_date: todayISO(),
          bonus_minutes: bonusMinutes, is_locked: false, set_by_name: myMember.full_name,
        });
      }
    }
    await notifyMember(admin, myMember.family_id, txn.user_id, 'Penukaran Disetujui', `Penukaran ${Math.abs(txn.points)} poin disetujui`, 'redemption_approved', transaction_id);
    return ok(res, { success: true, status: 'approved' });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
