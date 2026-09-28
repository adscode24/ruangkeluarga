import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const updates = {};
    if (body.full_name) updates.full_name = String(body.full_name).trim();
    if (body.phone !== undefined) updates.phone = String(body.phone || '').trim();
    if (body.avatar_url) updates.avatar_url = body.avatar_url;
    if (body.avatar_config) updates.avatar_config = body.avatar_config;
    const { data: updated, error } = await admin.from('family_members').update(updates).eq('id', myMember.id).select().single();
    if (error) throw new Error(error.message);
    if (body.full_name) await admin.from('profiles').update({ full_name: updates.full_name }).eq('id', myMember.user_id);
    return ok(res, { success: true, member: updated });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
