import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/api/supabaseClient';
import { isChild, isParent } from '@/lib/familyConstants';
import { Clock, Lock, AlertTriangle, Play } from 'lucide-react';

export default function ScreenTimeWidget() {
  const { member, members } = useFamily();
  const navigate = useNavigate();
  const [limits, setLimits] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!member) return;
    supabase.from('screen_time_limits').select('*').eq('family_id', member.family_id).then(({ data }) => setLimits(data || []));
    if (isChild(member.family_role)) {
      supabase.from('screen_time_sessions').select('*').eq('member_id', member.id).eq('status', 'active').then(({ data }) => setActiveSession(data?.[0] || null));
    }
  }, [member]);

  if (!member) return null;

  if (isChild(member.family_role)) {
    const myLimit = limits.find(l => l.member_id === member.id);
    const totalAllowed = (myLimit?.daily_limit_minutes || 0) + (myLimit?.bonus_minutes || 0);
    const used = myLimit?.used_today_minutes || 0;
    const remaining = Math.max(0, totalAllowed - used);
    const isLocked = myLimit?.is_locked || remaining <= 0;

    return (
      <button onClick={() => navigate('/screen-time')} className={`w-full rounded-2xl border-2 p-4 text-left active:scale-[0.98] transition-all ${activeSession ? 'border-primary/40 bg-primary/5' : isLocked ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${activeSession ? 'bg-primary/15' : isLocked ? 'bg-destructive/15' : 'bg-accent/15'}`}>
            {activeSession ? <Play className="h-5 w-5 text-primary" /> : isLocked ? <Lock className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-accent" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{activeSession ? 'Sesi Aktif' : isLocked ? 'Batas Habis' : 'Screen Time'}</p>
            <p className="text-xs text-muted-foreground truncate">{activeSession ? 'Ketuk untuk hentikan' : isLocked ? 'Tukar poin untuk bonus' : `Sisa ${remaining} menit hari ini`}</p>
          </div>
          <span className="text-2xl font-extrabold shrink-0">{activeSession ? '▶' : remaining}<span className="text-sm font-normal">{!activeSession && 'm'}</span></span>
        </div>
      </button>
    );
  }

  if (isParent(member.family_role)) {
    const children = members.filter(m => m.family_role === 'kakak' || m.family_role === 'adik');
    const lockedCount = children.filter(c => {
      const l = limits.find(l => l.member_id === c.id);
      const total = (l?.daily_limit_minutes || 0) + (l?.bonus_minutes || 0);
      const used = l?.used_today_minutes || 0;
      return l?.is_locked || (total - used <= 0);
    }).length;

    return (
      <button onClick={() => navigate('/screen-time')} className="w-full rounded-2xl border-2 border-border bg-card p-4 text-left active:scale-[0.98] transition-all">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Clock className="h-5 w-5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Kontrol Screen Time</p>
            <p className="text-xs text-muted-foreground truncate">{children.length} anak · {lockedCount > 0 ? `${lockedCount} terkunci` : 'Semua aktif'}</p>
          </div>
          {lockedCount > 0 && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
        </div>
      </button>
    );
  }

  return null;
}
