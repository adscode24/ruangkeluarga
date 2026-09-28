import { requireMember, ok, fail, withCors } from '../../_lib/auth.js';
import { isParent } from '../../_lib/helpers.js';

async function handler(req, res) {
  try {
    const { member, admin } = await requireMember(req);
    if (!isParent(member.family_role)) {
      return fail(res, Object.assign(new Error('Hanya orang tua yang dapat melihat analisis'), { status: 403 }));
    }
    const { data: messages } = await admin.from('room_messages').select('sender_name,sender_role,message_type,created_at')
      .eq('family_id', member.family_id).order('created_at', { ascending: false }).limit(80);
    const counts = {};
    for (const m of messages || []) counts[m.sender_name || m.sender_role || '?'] = (counts[m.sender_name || '?'] || 0) + 1;

    const summary = { total: (messages || []).length, perSender: counts };
    if (!process.env.OPENAI_API_KEY) {
      return ok(res, {
        analysis: {
          headline: 'Komunikasi keluarga berjalan',
          highlights: [`${summary.total} pesan terakhir dianalisis`, ...Object.entries(counts).slice(0, 3).map(([n, c]) => `${n}: ${c} pesan`)],
          balance_notes: 'Distribusi pesan cukup merata. Pertahankan waktu ngobrol tanpa gawai 15 menit/hari.',
          suggestion: 'Aktifkan OPENAI_API_KEY untuk analisis AI yang lebih dalam (privacy-first, tanpa mengutip isi pesan).',
        },
      });
    }
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Anda analis komunikasi keluarga. JANGAN mengutip isi pesan. Hanya analisis pola (frekuensi, partisipasi, keseimbangan). Jawab JSON: headline, highlights[], balance_notes, suggestion. Bahasa Indonesia.' },
        { role: 'user', content: `Statistik pesan (tanpa isi): ${JSON.stringify(summary)}` },
      ],
    });
    return ok(res, { analysis: JSON.parse(completion.choices[0].message.content) });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
