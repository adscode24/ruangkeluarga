import { requireUser, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';
import { generateInviteCode, DEFAULT_ROOMS, VALID_ROLES } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const user = await requireUser(req);
    if (user.family_id) return fail(res, Object.assign(new Error('Anda sudah tergabung dalam sebuah Ruang Keluarga'), { status: 400 }));
    const body = await readBody(req);
    const familyName = String(body.family_name || '').trim();
    const founderName = String(body.full_name || user.full_name || user.email || '').trim();
    const founderRole = body.family_role || 'ayah';
    if (!familyName) return fail(res, Object.assign(new Error('Nama Ruang Keluarga wajib diisi'), { status: 400 }));
    if (!VALID_ROLES.includes(founderRole)) return fail(res, Object.assign(new Error('Peran tidak valid'), { status: 400 }));

    const admin = adminClient();
    const inviteCode = generateInviteCode();
    const { data: family, error: e1 } = await admin.from('families').insert({
      family_name: familyName, invite_code: inviteCode, virtual_home_config: {}, created_by: user.id,
    }).select().single();
    if (e1) throw new Error(e1.message);

    const { data: member, error: e2 } = await admin.from('family_members').insert({
      family_id: family.id, user_id: user.id, full_name: founderName, family_role: founderRole,
      is_founder: true, current_location: 'ruang_keluarga', outside_location_name: '', points_balance: 0, is_active: true,
    }).select().single();
    if (e2) throw new Error(e2.message);

    await admin.from('family_rooms').insert(DEFAULT_ROOMS.map((r) => ({
      family_id: family.id, room_name: r.room_name, room_description: r.room_description,
      allowed_roles: r.allowed_roles, is_active: true,
    })));

    await admin.from('profiles').update({ family_id: family.id }).eq('id', user.id);
    return ok(res, { success: true, family_id: family.id, invite_code: inviteCode, member_id: member.id });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
