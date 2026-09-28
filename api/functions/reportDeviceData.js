import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member, admin } = await requireMember(req);
    const body = await readBody(req);
    const data = {
      family_id: member.family_id,
      member_id: member.id,
      battery_level: body.battery_level ?? null,
      is_charging: body.is_charging ?? false,
      location_lat: body.location_lat ?? null,
      location_lng: body.location_lng ?? null,
      location_name: body.location_name || '',
      app_usage: body.app_usage || [],
    };
    const { data: ex } = await admin.from('device_reports').select('*').eq('member_id', member.id).limit(1);
    if (ex?.[0]) await admin.from('device_reports').update(data).eq('id', ex[0].id);
    else await admin.from('device_reports').insert(data);
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
