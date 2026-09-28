import { requireUser, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') return fail(res, Object.assign(new Error('Akses ditolak — khusus Super Admin'), { status: 403 }));
    const body = await readBody(req);
    const { family_id, plan } = body;
    if (!family_id || !plan) return fail(res, Object.assign(new Error('Parameter tidak lengkap'), { status: 400 }));
    if (!['free', 'premium_monthly', 'premium_yearly'].includes(plan)) {
      return fail(res, Object.assign(new Error('Paket tidak valid'), { status: 400 }));
    }
    const admin = adminClient();
    const { data: ex } = await admin.from('subscriptions').select('*').eq('family_id', family_id).limit(1);
    if (ex?.[0]) await admin.from('subscriptions').update({ plan, status: 'active' }).eq('id', ex[0].id);
    else await admin.from('subscriptions').insert({ family_id, plan, status: 'active' });
    return ok(res, { success: true, plan });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
