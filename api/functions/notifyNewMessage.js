import { ok, fail, readBody, withCors } from '../../_lib/auth.js';
import { adminClient } from '../../_lib/supabase.js';
import { notifyMember } from '../../_lib/helpers.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const body = await readBody(req);
    const { message_id, message_type } = body;
    const admin = adminClient();
    if (message_type === 'room') {
      const { data: msgs } = await admin.from('room_messages').select('*').eq('id', message_id).limit(1);
      const msg = (msgs || [])[0];
      if (!msg) return fail(res, Object.assign(new Error('Not found'), { status: 404 }));
      if (msg.message_type === 'system_notification') return ok(res, { success: true, skipped: true });
      const { data: members } = await admin.from('family_members').select('*').eq('family_id', msg.family_id).eq('is_active', true);
      const preview = (msg.content || '').length > 100 ? `${(msg.content || '').substring(0, 100)}...` : (msg.content || '');
      for (const m of members || []) {
        if (m.user_id === msg.sender_id) continue;
        await notifyMember(admin, msg.family_id, m.user_id, 'Pesan Baru di Ruang Keluarga', `${msg.sender_name}: ${preview}`, 'new_message', message_id);
      }
    } else if (message_type === 'direct') {
      const { data: msgs } = await admin.from('direct_messages').select('*').eq('id', message_id).limit(1);
      const msg = (msgs || [])[0];
      if (!msg) return fail(res, Object.assign(new Error('Not found'), { status: 404 }));
      const preview = (msg.content || '').length > 100 ? `${(msg.content || '').substring(0, 100)}...` : (msg.content || '');
      await notifyMember(admin, msg.family_id, msg.receiver_id, 'Pesan Baru', `${msg.sender_name}: ${preview}`, 'new_message', message_id);
    }
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
