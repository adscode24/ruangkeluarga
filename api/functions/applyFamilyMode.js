import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { isParent } from '../../_lib/helpers.js';

function scheduleActive(schedule, now = new Date()) {
  if (!schedule.is_active) return false;
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const day = dayMap[now.getDay()];
  if (schedule.days?.length && !schedule.days.includes(day)) return false;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return schedule.start_time <= hhmm && hhmm <= schedule.end_time;
}

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { member: myMember, admin } = await requireMember(req);
    if (!isParent(myMember.family_role)) {
      return fail(res, Object.assign(new Error('Hanya orang tua yang dapat menerapkan mode'), { status: 403 }));
    }
    const body = await readBody(req);
    const scheduleId = body.schedule_id;
    const { data: s } = await admin.from('family_schedules').select('*').eq('id', scheduleId).limit(1);
    const schedule = (s || [])[0];
    if (!schedule || schedule.family_id !== myMember.family_id) {
      return fail(res, Object.assign(new Error('Jadwal tidak ditemukan'), { status: 404 }));
    }
    const { data: members } = await admin.from('family_members').select('*')
      .eq('family_id', myMember.family_id).eq('is_active', true).in('family_role', ['kakak', 'adik']);
    let moved = 0;
    for (const m of members || []) {
      await admin.from('family_members').update({
        current_location: schedule.auto_location,
        outside_location_name: schedule.auto_location === 'luar_rumah' ? (schedule.outside_label || '') : '',
      }).eq('id', m.id);
      moved++;
    }
    return ok(res, { success: true, moved, schedule: schedule.label || schedule.mode });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
