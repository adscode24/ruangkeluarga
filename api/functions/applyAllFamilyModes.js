import { ok, fail, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';

function scheduleActive(schedule, now = new Date()) {
  if (!schedule.is_active) return false;
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const day = dayMap[now.getDay()];
  if (schedule.days?.length && !schedule.days.includes(day)) return false;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return schedule.start_time <= hhmm && hhmm <= schedule.end_time;
}

// Dipanggil manual (POST) atau via Vercel Cron tiap 30 menit (GET).
async function handler(req, res) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (req.method === 'GET' && cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
      // Izinkan cron Vercel tanpa secret juga (path tidak tertebak), tapi catat.
    }
    const admin = adminClient();
    const now = new Date();
    const { data: schedules } = await admin.from('family_schedules').select('*').eq('is_active', true);
    let applied = 0;
    for (const sch of schedules || []) {
      if (!scheduleActive(sch, now)) continue;
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
    return ok(res, { success: true, applied, checked: (schedules || []).length });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
