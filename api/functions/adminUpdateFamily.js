import { requireUser, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') return fail(res, Object.assign(new Error('Akses ditolak'), { status: 403 }));
    const body = await readBody(req);
    const { family_id, family_name } = body;
    if (!family_id) return fail(res, Object.assign(new Error('family_id wajib diisi'), { status: 400 }));
    const admin = adminClient();
    const patch = {};
    if (family_name) patch.family_name = String(family_name).trim();
    if (body.virtual_home_config) patch.virtual_home_config = body.virtual_home_config;
    const { data, error } = await admin.from('families').update(patch).eq('id', family_id).select().single();
    if (error) throw new Error(error.message);
    return ok(res, { success: true, family: data });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
