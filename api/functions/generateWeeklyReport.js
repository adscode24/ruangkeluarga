import { requireMember, ok, fail, withCors } from '../../_lib/auth.js';

function fallbackReport(stats) {
  return {
    headline: `Keluarga aktif: ${stats.totalMessages} pesan, ${stats.tasksApproved}/${stats.totalTasks} tugas disetujui minggu ini`,
    highlights: [
      `${stats.totalMessages} pesan terkirim dalam 7 hari`,
      `${stats.tasksApproved} tugas selesai dan disetujui`,
      `${stats.totalPointsEarned} poin earned oleh anak`,
    ],
    balance_notes: 'Hubungkan OPENAI_API_KEY di Vercel untuk analisis AI yang lebih hangat dan personal.',
    suggestion: 'Rayakan 1 pencapaian kecil bersama malam ini — misalnya tugas dengan streak terpanjang.',
  };
}

async function handler(req, res) {
  try {
    const { member, admin } = await requireMember(req);
    const fid = member.family_id;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const [{ data: messages }, { data: tasks }, { data: transactions }, { data: allMembers }] = await Promise.all([
      admin.from('room_messages').select('*').eq('family_id', fid).order('created_at', { ascending: false }).limit(500),
      admin.from('family_tasks').select('*').eq('family_id', fid).order('created_at', { ascending: false }).limit(200),
      admin.from('point_transactions').select('*').eq('family_id', fid).order('created_at', { ascending: false }).limit(300),
      admin.from('family_members').select('*').eq('family_id', fid),
    ]);
    const recentMsgs = (messages || []).filter((m) => new Date(m.created_at) > since);
    const recentTasks = (tasks || []).filter((t) => new Date(t.created_at) > since);
    const recentTxns = (transactions || []).filter((t) => new Date(t.created_at) > since);

    const perMember = (allMembers || []).filter((m) => m.is_active).map((m) => ({
      name: m.full_name, role: m.family_role,
      msgs: recentMsgs.filter((x) => x.sender_id === m.user_id).length,
      tasksDone: recentTasks.filter((t) => t.assigned_to_id === m.id && t.status === 'approved').length,
      pointsEarned: recentTxns.filter((t) => t.member_id === m.id && t.type === 'earned').reduce((s, t) => s + (t.points || 0), 0),
      pointsRedeemed: recentTxns.filter((t) => t.member_id === m.id && t.type !== 'earned' && t.status === 'completed').reduce((s, t) => s + Math.abs(t.points || 0), 0),
    }));
    const stats = {
      totalMessages: recentMsgs.length,
      totalTasks: recentTasks.length,
      tasksApproved: recentTasks.filter((t) => t.status === 'approved').length,
      totalPointsEarned: recentTxns.filter((t) => t.type === 'earned').reduce((s, t) => s + (t.points || 0), 0),
      perMember,
    };

    if (!process.env.OPENAI_API_KEY) return ok(res, { stats, report: fallbackReport(stats) });

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Anda asisten "Nutrisi Digital" untuk aplikasi keluarga Indonesia "Ruang Keluarga". Jawab JSON dengan kunci: headline, highlights[], balance_notes, suggestion. Hangat, singkat, membangun.' },
        { role: 'user', content: `Data aktivitas 7 hari: ${JSON.stringify(stats)}` },
      ],
    });
    let report;
    try { report = JSON.parse(completion.choices[0].message.content); }
    catch { report = fallbackReport(stats); }
    return ok(res, { stats, report });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
