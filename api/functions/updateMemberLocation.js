import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { isParent, canChangeOwnLocation, isChild, VALID_LOCATIONS, notifyParents } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { user, member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const { member_id: memberId, location } = body;
    const outsideName = String(body.outside_location_name || '').trim();
    if (!memberId || !location) return fail(res, Object.assign(new Error('Data tidak lengkap'), { status: 400 }));
    if (!VALID_LOCATIONS.includes(location)) return fail(res, Object.assign(new Error('Lokasi tidak valid'), { status: 400 }));

    const { data: t } = await admin.from('family_members').select('*').eq('id', memberId).limit(1);
    const target = (t || [])[0];
    if (!target) return fail(res, Object.assign(new Error('Anggota target tidak ditemukan'), { status: 404 }));
    if (target.family_id !== myMember.family_id) return fail(res, Object.assign(new Error('Tidak diizinkan'), { status: 403 }));

    const patch = { current_location: location, outside_location_name: location === 'luar_rumah' ? outsideName : '' };
    const isSelf = target.user_id === user.id;
    if (isSelf) {
      if (!canChangeOwnLocation(myMember.family_role)) {
        return fail(res, Object.assign(new Error('Adik tidak dapat mengubah lokasi sendiri. Minta orang tua untuk mengaturnya.'), { status: 403 }));
      }
    } else if (!isParent(myMember.family_role)) {
      return fail(res, Object.assign(new Error('Hanya orang tua yang dapat mengubah lokasi anggota lain'), { status: 403 }));
    }
    await admin.from('family_members').update(patch).eq('id', memberId);

    if (isSelf && location === 'luar_rumah' && isChild(myMember.family_role)) {
      await notifyParents(admin, myMember.family_id, `${myMember.full_name} Keluar Rumah`,
        `${myMember.full_name} sedang di ${outsideName || 'luar rumah'}`, 'location_changed', memberId);
    }
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
