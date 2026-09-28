import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROOM_LABELS, ROOM_EMOJI, canAccessRoom, isParent } from '@/lib/familyConstants';
import { ArrowLeft, Send, Pin } from 'lucide-react';

export default function RoomChat() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { member, rooms, user } = useFamily();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const room = rooms.find((r) => r.id === roomId);

  const loadMessages = async () => {
    if (!roomId) return;
    const { data } = await supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200);
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    const ch = supabase.channel('roommsg-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages' }, () => loadMessages()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (!member) return null;
  if (!room) return <div className="p-8 text-center text-muted-foreground">Ruang tidak ditemukan</div>;
  if (!canAccessRoom(member.family_role, room.allowed_roles)) {
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="font-bold text-lg mb-1">Akses Dibatasi</h2>
        <p className="text-sm text-muted-foreground mb-4">Peran Anda tidak diizinkan masuk ke ruang ini.</p>
        <Button onClick={() => navigate('/')} variant="outline">Kembali ke Rumah</Button>
      </div>
    );
  }

  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    await supabase.from('room_messages').insert({
      family_id: member.family_id,
      room_id: roomId,
      sender_id: user.id,
      sender_name: member.full_name,
      sender_role: member.family_role,
      message_type: 'text',
      content,
      is_pinned: false,
    });
  };

  const togglePin = async (msg) => {
    await supabase.from('room_messages').update({ is_pinned: !msg.is_pinned }).eq('id', msg.id);
    loadMessages();
  };

  const pinned = messages.filter((m) => m.is_pinned);
  const sorted = [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)]">
      <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border bg-card/95 backdrop-blur sticky top-0 z-40">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <span className="text-2xl">{ROOM_EMOJI[room.room_name]}</span>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold leading-tight truncate">{ROOM_LABELS[room.room_name]}</h1>
          <p className="text-xs text-muted-foreground truncate">{room.room_description}</p>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="bg-accent/15 border-b border-accent/30 px-4 py-2 space-y-1">
          {pinned.map((m) => (
            <div key={m.id} className="flex items-start gap-2 text-sm">
              <Pin className="h-3 w-3 mt-1 text-accent shrink-0" />
              <div className="flex-1"><span className="font-semibold">{m.sender_name}: </span><span>{m.content}</span></div>
              {isParent(member.family_role) && <button onClick={() => togglePin(m)} className="text-xs text-muted-foreground shrink-0">lepas</button>}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && <p className="text-center text-muted-foreground text-sm">Memuat pesan...</p>}
        {sorted.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border rounded-bl-md'}`}>
                {!mine && <p className="text-xs font-bold mb-0.5">{m.sender_name}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <div className={`flex items-center gap-1.5 mt-0.5 ${mine ? 'justify-end' : ''}`}>
                  <span className={`text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isParent(member.family_role) && (
                    <button onClick={() => togglePin(m)} className="opacity-40 hover:opacity-100">
                      <Pin className={`h-3 w-3 ${m.is_pinned ? 'fill-current text-accent' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && sorted.length === 0 && <p className="text-center text-muted-foreground text-sm mt-8">Belum ada pesan. Sapa keluarga di sini! 👋</p>}
      </div>

      <div className="px-4 py-3 border-t border-border bg-card flex items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Tulis pesan..." className="rounded-full" />
        <Button onClick={send} size="icon" className="rounded-full h-11 w-11 shrink-0"><Send className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
