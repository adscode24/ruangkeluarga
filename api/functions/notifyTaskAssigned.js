import { ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';
import { notifyMember } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const body = await readBody(req);
    const admin = adminClient();
    const { data: t } = await admin.from('family_tasks').select('*').eq('id', body.task_id).limit(1);
    const task = (t || [])[0];
    if (!task) return fail(res, Object.assign(new Error('Not found'), { status: 404 }));
    if (!task.assigned_to_id) return ok(res, { success: true, skipped: true });
    const { data: m } = await admin.from('family_members').select('*').eq('id', task.assigned_to_id).limit(1);
    const assignee = (m || [])[0];
    if (!assignee) return ok(res, { success: true, skipped: true });
    await notifyMember(admin, task.family_id, assignee.user_id, 'Tugas Baru untuk Anda', `${task.title} (+${task.points_reward} poin)`, 'task_assigned', task.id);
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
