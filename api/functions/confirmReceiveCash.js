import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { notifyParents } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const transactionId = body.transaction_id;
    if (!transactionId) return fail(res, Object.assign(new Error('ID transaksi wajib diisi'), { status: 400 }));
    const { data: t } = await admin.from('point_transactions').select('*').eq('id', transactionId).limit(1);
    const txn = (t || [])[0];
    if (!txn) return fail(res, Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 }));
    if (txn.member_id !== myMember.id) return fail(res, Object.assign(new Error('Tidak diizinkan'), { status: 403 }));
    if (txn.type !== 'redeemed_for_cash') return fail(res, Object.assign(new Error('Bukan transaksi uang tunai'), { status: 400 }));
    if (txn.status !== 'approved') return fail(res, Object.assign(new Error('Transaksi belum disetujui orang tua'), { status: 400 }));
    await admin.from('point_transactions').update({ status: 'completed' }).eq('id', transactionId);
    await notifyParents(admin, myMember.family_id, 'Uang Diterima',
      `${myMember.full_name} mengonfirmasi menerima uang dari penukaran ${Math.abs(txn.points)} poin`, 'cash_received', transactionId);
    return ok(res, { success: true, status: 'completed' });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
