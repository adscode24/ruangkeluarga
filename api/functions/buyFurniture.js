import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';

const PRICES = { sofa: 50, bed: 80, table: 40, plant: 20, tv: 100, desk: 60, bookshelf: 70, toybox: 30, lamp: 25, rug: 35 };

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const { type, room, pos_x, pos_z } = body;
    if (!type || !room) return fail(res, Object.assign(new Error('Tipe dan ruang wajib diisi'), { status: 400 }));
    const cost = PRICES[type] ?? 0;
    if ((myMember.points_balance || 0) < cost) {
      return fail(res, Object.assign(new Error('Poin tidak cukup'), { status: 400 }));
    }
    await admin.from('family_members').update({ points_balance: (myMember.points_balance || 0) - cost }).eq('id', myMember.id);
    const { data: item, error } = await admin.from('furniture').insert({
      family_id: myMember.family_id, type, room, pos_x: pos_x ?? 0, pos_z: pos_z ?? 0, cost,
    }).select().single();
    if (error) throw new Error(error.message);
    return ok(res, { success: true, item });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
