import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { VALID_ROLES } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const { member_id, new_role } = body;
    if (!member_id || !new_role) return fail(res, Object.assign(new Error('Parameter tidak lengkap'), { status: 400 }));
    if (!VALID_ROLES.includes(new_role)) return fail(res, Object.assign(new Error('Peran tidak valid'), { status: 400 }));
    if (myMember.family_role !== 'ayah' && myMember.family_role !== 'ibu') {
      return fail(res, Object.assign(new Error('Hanya Ayah/Ibu yang dapat mengubah peran anggota'), { status: 403 }));
    }
    const { data: t } = await admin.from('family_members').select('*').eq('id', member_id).limit(1);
    const target = (t || [])[0];
    if (!target) return fail(res, Object.assign(new Error('Anggota tidak ditemukan'), { status: 404 }));
    if (target.family_id !== myMember.family_id) return fail(res, Object.assign(new Error('Anggota tidak ditemukan'), { status: 404 }));
    await admin.from('family_members').update({ family_role: new_role }).eq('id', member_id);
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
