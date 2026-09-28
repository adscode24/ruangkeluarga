import { requireUser, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const user = await requireUser(req);
    const body = await readBody(req);
    const invitationId = body.invitation_id;
    const fullName = String(body.full_name || user.full_name || user.email || '').trim();
    if (!invitationId) return fail(res, Object.assign(new Error('ID undangan wajib diisi'), { status: 400 }));
    const admin = adminClient();
    const { data: inv } = await admin.from('family_invitations').select('*').eq('id', invitationId).limit(1);
    const invitation = (inv || [])[0];
    if (!invitation) return fail(res, Object.assign(new Error('Undangan tidak ditemukan'), { status: 404 }));
    if (invitation.email.toLowerCase() !== String(user.email || '').toLowerCase()) {
      return fail(res, Object.assign(new Error('Undangan ini bukan untuk akun Anda'), { status: 403 }));
    }
    const { data: existing } = await admin.from('family_members').select('*').eq('family_id', invitation.family_id).eq('user_id', user.id).limit(1);
    let memberId = existing?.[0]?.id;
    if (!memberId) {
      const { data: member, error } = await admin.from('family_members').insert({
        family_id: invitation.family_id, user_id: user.id, full_name: fullName,
        family_role: invitation.role, is_founder: false, current_location: 'ruang_keluarga',
        outside_location_name: '', points_balance: 0, is_active: true,
      }).select().single();
      if (error) throw new Error(error.message);
      memberId = member.id;
    }
    await admin.from('family_invitations').update({ status: 'accepted' }).eq('id', invitationId);
    await admin.from('profiles').update({ family_id: invitation.family_id }).eq('id', user.id);
    return ok(res, { success: true, family_id: invitation.family_id, member_id: memberId });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
