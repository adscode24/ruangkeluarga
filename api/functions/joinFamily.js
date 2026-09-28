import { requireUser, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';
import { VALID_ROLES } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const user = await requireUser(req);
    if (user.family_id) return fail(res, Object.assign(new Error('Anda sudah tergabung dalam sebuah Ruang Keluarga'), { status: 400 }));
    const body = await readBody(req);
    const inviteCode = String(body.invite_code || '').trim().toUpperCase();
    const memberName = String(body.full_name || user.full_name || user.email || '').trim();
    const memberRole = body.family_role;
    if (!inviteCode) return fail(res, Object.assign(new Error('Kode undangan wajib diisi'), { status: 400 }));
    if (!VALID_ROLES.includes(memberRole)) return fail(res, Object.assign(new Error('Peran tidak valid'), { status: 400 }));

    const admin = adminClient();
    const { data: families } = await admin.from('families').select('*').eq('invite_code', inviteCode).limit(1);
    const family = (families || [])[0];
    if (!family) return fail(res, Object.assign(new Error('Kode undangan tidak ditemukan'), { status: 404 }));

    const { data: existing } = await admin.from('family_members').select('*').eq('family_id', family.id).eq('user_id', user.id).limit(1);
    if (existing?.length) {
      await admin.from('profiles').update({ family_id: family.id }).eq('id', user.id);
      return ok(res, { success: true, family_id: family.id, member_id: existing[0].id, rejoined: true });
    }
    const { data: member, error } = await admin.from('family_members').insert({
      family_id: family.id, user_id: user.id, full_name: memberName, family_role: memberRole,
      is_founder: false, current_location: 'ruang_keluarga', outside_location_name: '', points_balance: 0, is_active: true,
    }).select().single();
    if (error) throw new Error(error.message);
    await admin.from('profiles').update({ family_id: family.id }).eq('id', user.id);
    return ok(res, { success: true, family_id: family.id, member_id: member.id });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
