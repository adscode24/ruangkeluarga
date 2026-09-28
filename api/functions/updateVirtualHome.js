import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { isParent } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { user, member: myMember, admin } = await requireMember(req);
    if (!user.family_id) return fail(res, Object.assign(new Error('Belum tergabung keluarga'), { status: 404 }));
    if (!isParent(myMember.family_role)) {
      return fail(res, Object.assign(new Error('Hanya orang tua yang dapat mengubah konfigurasi rumah'), { status: 403 }));
    }
    const body = await readBody(req);
    const config = body.virtual_home_config;
    if (!config || typeof config !== 'object') return fail(res, Object.assign(new Error('Konfigurasi tidak valid'), { status: 400 }));
    await admin.from('families').update({ virtual_home_config: config }).eq('id', user.family_id);
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
