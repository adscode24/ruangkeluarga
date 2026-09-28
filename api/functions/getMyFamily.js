import { requireUser, ok, fail, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

async function handler(req, res) {
  try {
    const user = await requireUser(req);
    if (!user.family_id) return fail(res, Object.assign(new Error('Belum tergabung keluarga'), { status: 404 }));
    const admin = adminClient();
    const { data: fam } = await admin.from('families').select('*').eq('id', user.family_id).limit(1);
    const { data: members } = await admin.from('family_members').select('*').eq('family_id', user.family_id).eq('is_active', true);
    const { data: rooms } = await admin.from('family_rooms').select('*').eq('family_id', user.family_id).eq('is_active', true);
    return ok(res, {
      family: (fam || [])[0] || null,
      members: members || [],
      rooms: rooms || [],
      my_member: (members || []).find((m) => m.user_id === user.id) || null,
    });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
