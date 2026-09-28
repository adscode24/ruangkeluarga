import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MemberAvatar from '@/components/family/MemberAvatar';
import RoleBadge from '@/components/family/RoleBadge';
import { ROOM_LABELS } from '@/lib/familyConstants';
import { ArrowLeft, Send } from 'lucide-react';

export default function Messages() {
  const { user, member, members } = useFamily();
  const navigate = useNavigate();
  const { userId } = useParams();
  const active = userId ? members.find((m) => m.user_id === userId) || null : null;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  const others = members.filter((m) => m.user_id !== user?.id && m.is_active);

  const loadMessages = async () => {
    if (!active || !user || !member) return;
    const all = await base44.entities.DirectMessage.filter({ family_id: member.family_id }, 'created_date', 500);
    const convo = all.filter(
      (m) => (m.sender_id === user.id && m.receiver_id === active.user_id) || (m.sender_id === active.user_id && m.receiver_id === user.id)
    );
    setMessages(convo);
    const unread = convo.filter((m) => m.receiver_id === user.id && !m.read_at);
    if (unread.length) {
      await Promise.all(unread.map((m) => base44.entities.DirectMessage.update(m.id, { read_at: new Date().toISOString() })));
    }
  };

  useEffect(() => {
    loadMessages();
    const unsub = base44.entities.DirectMessage.subscribe(() => loadMessages());
    return () => unsub();
  }, [active, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (!member) return null;

  const send = async () => {
    if (!text.trim() || !active) return;
    const content = text.trim();
    setText('');
    await base44.entities.DirectMessage.create({
      family_id: member.family_id,
      sender_id: user.id,
      receiver_id: active.user_id,
      sender_name: member.full_name,
      content,
      read_at: null,
    });
  };

  if (active) {
    const sorted = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    return (
      <div className="flex flex-col h-[calc(100dvh-5rem)]">
        <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border bg-card">
          <button onClick={() => navigate('/messages')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
          <MemberAvatar member={active} size="md" />
          <div>
            <h1 className="font-bold leading-tight">{active.full_name}</h1>
            <RoleBadge role={active.family_role} />
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {sorted.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border rounded-bl-md'}`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  <span className={`text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(m.created_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    {mine && (m.read_at ? ' · Dibaca' : ' · Terkirim')}
                  </span>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <p className="text-center text-muted-foreground text-sm mt-8">Mulai percakapan dengan {active.full_name} 👋</p>}
        </div>
        <div className="px-4 py-3 border-t border-border bg-card flex items-center gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Tulis pesan..." className="rounded-full" />
          <Button onClick={send} size="icon" className="rounded-full h-11 w-11 shrink-0"><Send className="h-5 w-5" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-2xl font-extrabold mb-4">Pesan</h1>
      <div className="space-y-2">
        {others.map((m) => (
          <button key={m.id} onClick={() => navigate(`/messages/${m.user_id}`)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card border border-transparent hover:border-border transition-colors text-left select-none">
            <MemberAvatar member={m} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold truncate">{m.full_name}</p>
                <RoleBadge role={m.family_role} />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {m.current_location === 'luar_rumah' ? `📍 ${m.outside_location_name || 'Luar'}` : ROOM_LABELS[m.current_location]}
              </p>
            </div>
          </button>
        ))}
        {others.length === 0 && <p className="text-center text-muted-foreground text-sm mt-8">Belum ada anggota lain. Undang keluarga Anda dari tab Keluarga!</p>}
      </div>
    </div>
  );
}