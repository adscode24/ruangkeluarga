import { requireMember, ok, fail, withCors } from '../../_lib/auth.js';

async function handler(req, res) {
  try {
    const { member, admin } = await requireMember(req);
    const { data: sub } = await admin.from('subscriptions').select('*').eq('family_id', member.family_id).limit(1);
    const s = (sub || [])[0];
    if (!s) return ok(res, { plan: 'free', status: 'active', isPremium: false });
    const isPremium = s.plan !== 'free' && s.status === 'active';
    return ok(res, { ...s, isPremium });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
