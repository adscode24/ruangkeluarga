import { requireUser, ok, fail, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';
import { ROLE_LABELS } from '../../_lib/helpers.js';

async function handler(req, res) {
  try {
    const user = await requireUser(req);
    const admin = adminClient();
    const { data: inv } = await admin.from('family_invitations').select('*').eq('email', String(user.email || '').toLowerCase()).eq('status', 'pending').order('created_at', { ascending: false }).limit(1);
    const invitation = (inv || [])[0];
    if (!invitation) return ok(res, { has_invitation: false, invitations: [] });
    const { data: fam } = await admin.from('families').select('*').eq('id', invitation.family_id).limit(1);
    return ok(res, {
      has_invitation: true,
      invitation_id: invitation.id,
      family_name: fam?.[0]?.family_name || 'Keluarga',
      role: invitation.role,
      role_label: ROLE_LABELS[invitation.role] || invitation.role,
      invited_by: invitation.invited_by_name || '',
    });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
