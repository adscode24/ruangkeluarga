import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { notifyMember, notifyParents, todayISO } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { user, member: myMember, admin } = await requireMember(req);
    const body = await readBody(req);
    const { task_id, action } = body;
    if (!task_id || !['complete', 'approve', 'reject'].includes(action)) {
      return fail(res, Object.assign(new Error('Parameter tidak valid'), { status: 400 }));
    }
    const { data: t } = await admin.from('family_tasks').select('*').eq('id', task_id).limit(1);
    const task = (t || [])[0];
    if (!task) return fail(res, Object.assign(new Error('Tugas tidak ditemukan'), { status: 404 }));
    if (task.family_id !== myMember.family_id) return fail(res, Object.assign(new Error('Tidak diizinkan'), { status: 403 }));

    if (action === 'complete') {
      if (task.assigned_to_id !== myMember.id) return fail(res, Object.assign(new Error('Hanya penerima tugas yang dapat menyelesaikan'), { status: 403 }));
      await admin.from('family_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', task_id);
      await notifyParents(admin, myMember.family_id, 'Tugas Selesai', `${myMember.full_name} menyelesaikan "${task.title}" — menunggu persetujuan`, 'task_completed', task_id);
      return ok(res, { success: true, status: 'completed' });
    }

    const isParentUser = myMember.family_role === 'ayah' || myMember.family_role === 'ibu';
    if (!isParentUser) return fail(res, Object.assign(new Error('Hanya orang tua yang dapat menyetujui'), { status: 403 }));

    if (action === 'reject') {
      await admin.from('family_tasks').update({ status: 'rejected' }).eq('id', task_id);
      return ok(res, { success: true, status: 'rejected' });
    }

    // approve
    await admin.from('family_tasks').update({ status: 'approved' }).eq('id', task_id);
    const { data: assignees } = await admin.from('family_members').select('*').eq('id', task.assigned_to_id).limit(1);
    const assignee = (assignees || [])[0];
    if (assignee) {
      const today = todayISO();
      const lastDate = assignee.last_task_date;
      let streak = assignee.streak_days || 0;
      if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        streak = lastDate === yesterday ? streak + 1 : 1;
      }
      await admin.from('family_members').update({
        points_balance: (assignee.points_balance || 0) + (task.points_reward || 0),
        streak_days: streak, last_task_date: today,
      }).eq('id', assignee.id);
      await admin.from('point_transactions').insert({
        family_id: myMember.family_id, member_id: assignee.id, user_id: assignee.user_id,
        user_name: assignee.full_name, type: 'earned', points: task.points_reward || 0,
        description: `Tugas: ${task.title}`, status: 'completed',
        approved_by_id: myMember.id, approved_by_name: myMember.full_name,
      });
      await notifyMember(admin, myMember.family_id, assignee.user_id, 'Poin Diterima!', `+${task.points_reward} poin untuk "${task.title}"`, 'points_earned', task_id);
    }
    return ok(res, { success: true, status: 'approved' });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
