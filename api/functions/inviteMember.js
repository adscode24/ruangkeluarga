import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { isParent, VALID_ROLES, ROLE_LABELS } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const role = body.role;
    if (!email || !email.includes('@')) return fail(res, Object.assign(new Error('Email tidak valid'), { status: 400 }));
    if (!VALID_ROLES.includes(role)) return fail(res, Object.assign(new Error('Peran tidak valid'), { status: 400 }));
    if (!isParent(myMember.family_role)) return fail(res, Object.assign(new Error('Hanya orang tua yang dapat mengundang anggota'), { status: 403 }));

    const { data: existing } = await admin.from('family_invitations').select('*')
      .eq('family_id', myMember.family_id).eq('email', email).eq('status', 'pending').limit(1);
    if (existing?.length) return fail(res, Object.assign(new Error('Undangan pending untuk email ini sudah ada'), { status: 400 }));

    await admin.from('family_invitations').insert({
      family_id: myMember.family_id, email, role, invited_by_name: myMember.full_name, status: 'pending',
    });
    const { data: fam } = await admin.from('families').select('*').eq('id', myMember.family_id).limit(1);
    return ok(res, { success: true, email, role, role_label: ROLE_LABELS[role], family_name: fam?.[0]?.family_name || 'Keluarga' });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
