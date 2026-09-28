import { ok, fail, withCors } from '../_lib/auth.js';
import { adminClient } from '../_lib/supabase.js';

async function handler(req, res) {
  try {
    const admin = adminClient();
    const now = new Date();
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = dayMap[now.getDay()];
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const { data: schedules } = await admin.from('family_schedules').select('*').eq('is_active', true);
    let applied = 0;
    for (const sch of schedules || []) {
      if (sch.days?.length && !sch.days.includes(day)) continue;
      if (!(sch.start_time <= hhmm && hhmm <= sch.end_time)) continue;
      const { data: members } = await admin.from('family_members').select('*')
        .eq('family_id', sch.family_id).eq('is_active', true).in('family_role', ['kakak', 'adik']);
      for (const m of members || []) {
        await admin.from('family_members').update({
          current_location: sch.auto_location,
          outside_location_name: sch.auto_location === 'luar_rumah' ? (sch.outside_label || '') : '',
        }).eq('id', m.id);
        applied++;
      }
    }
    return ok(res, { success: true, applied });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
