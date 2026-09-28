import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import MemberAvatar from '@/components/family/MemberAvatar';
import { isChild, isParent } from '@/lib/familyConstants';
import { Clock, Play, Square, Lock, Unlock, Timer, AlertTriangle, ChevronLeft, Smartphone } from 'lucide-react';
import DeviceDetailDialog from '@/components/family/DeviceDetailDialog';

export default function ScreenTime() {
  const { member, members, refresh } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [limits, setLimits] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedChild, setSelectedChild] = useState(null);

  const loadData = useCallback(async () => {
    if (!member) return;
    try {
      const [{ data: limitData }, { data: sessionData }] = await Promise.all([
        supabase.from('screen_time_limits').select('*').eq('family_id', member.family_id),
        isChild(member.family_role)
          ? supabase.from('screen_time_sessions').select('*').eq('member_id', member.id).eq('status', 'active')
          : Promise.resolve({ data: [] }),
      ]);
      setLimits(limitData || []);
      setActiveSession(sessionData?.[0] || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('sessions-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'screen_time_sessions' }, () => loadData()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const start = new Date(activeSession.start_time).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Child device reporting (battery + location)
  useEffect(() => {
    if (!member || !isChild(member.family_role)) return;
    const report = async () => {
      try {
        const payload = { app_usage: [] };
        if (navigator.getBattery) {
          const battery = await navigator.getBattery();
          payload.battery_level = Math.round(battery.level * 100);
          payload.is_charging = battery.charging;
        }
        const send = (loc) => {
          if (loc) { payload.location_lat = loc.lat; payload.location_lng = loc.lng; }
          supabase.functions.invoke('reportDeviceData', { body: payload }).catch(() => {});
        };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => send({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => send(null),
            { timeout: 8000, maximumAge: 30000 }
          );
        } else { send(null); }
      } catch (e) { /* ignore */ }
    };
    report();
    const interval = setInterval(report, 60000);
    return () => clearInterval(interval);
  }, [member]);

  if (loading || !member) {
    return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>;
  }

  const myLimit = limits.find(l => l.member_id === member.id);
  const children = members.filter(m => m.family_role === 'kakak' || m.family_role === 'adik');

  const handleStart = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('startScreenTimeSession', { body: {} });
      if (error) throw error;
      toast({ title: 'Sesi dimulai!', description: `Sisa waktu: ${data.remaining_minutes} menit` });
      loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Tidak bisa mulai', description: e.message });
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      const { data, error } = await supabase.functions.invoke('endScreenTimeSession', { body: { session_id: activeSession.id } });
      if (error) throw error;
      toast({ title: 'Sesi berakhir', description: `Durasi: ${data.duration_minutes} menit` });
      setActiveSession(null);
      loadData();
      refresh();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally {
      setStopping(false);
    }
  };

  const handleForceStop = async (sessionId) => {
    try {
      const { data, error } = await supabase.functions.invoke('endScreenTimeSession', { body: { session_id: sessionId, forced_by_name: member.full_name } });
      if (error) throw error;
      toast({ title: 'Sesi dihentikan', description: `Durasi: ${data.duration_minutes} menit` });
      loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    }
  };

  const handleSetLimit = async (memberId, minutes) => {
    try {
      const { error } = await supabase.functions.invoke('updateScreenTimeLimit', { body: { member_id: memberId, daily_limit_minutes: minutes } });
      if (error) throw error;
      toast({ title: 'Batas diperbarui', description: `${minutes} menit/hari` });
      loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    }
  };

  // CHILD VIEW
  if (isChild(member.family_role)) {
    const totalAllowed = (myLimit?.daily_limit_minutes || 0) + (myLimit?.bonus_minutes || 0);
    const used = myLimit?.used_today_minutes || 0;
    const remaining = Math.max(0, totalAllowed - used);
    const pct = totalAllowed > 0 ? Math.min(100, (used / totalAllowed) * 100) : 0;
    const isLocked = myLimit?.is_locked || remaining <= 0;

    return (
      <div className="px-5 pt-8 pb-24">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>
        <h1 className="text-2xl font-extrabold mb-1">Screen Time</h1>
        <p className="text-sm text-muted-foreground mb-6">Kelola waktu layar Anda</p>

        {activeSession ? (
          <Card className="p-6 mb-4 bg-gradient-to-br from-primary/15 to-primary/5 border-primary/30 text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-2"><Timer className="h-5 w-5" /><span className="text-sm font-bold">Sesi Aktif</span></div>
            <div className="text-5xl font-extrabold text-primary mb-1">{elapsed}<span className="text-2xl">m</span></div>
            <p className="text-xs text-muted-foreground mb-4">berjalan...</p>
            <Button onClick={handleStop} disabled={stopping} className="w-full rounded-full" variant="destructive">
              <Square className="h-4 w-4 mr-1" /> {stopping ? 'Menghentikan...' : 'Hentikan Sesi'}
            </Button>
          </Card>
        ) : isLocked ? (
          <Card className="p-6 mb-4 text-center border-destructive/30 bg-destructive/5">
            <Lock className="h-12 w-12 mx-auto text-destructive mb-3" />
            <h2 className="text-lg font-bold mb-1">Batas Hari Ini Habis</h2>
            <p className="text-sm text-muted-foreground mb-4">Tukar poin Anda untuk mendapat bonus menit screen time.</p>
            <Button onClick={() => navigate('/wallet')} className="rounded-full">Tukar Poin →</Button>
          </Card>
        ) : (
          <Card className="p-6 mb-4 text-center">
            <Clock className="h-12 w-12 mx-auto text-primary mb-3" />
            <div className="text-4xl font-extrabold text-primary mb-1">{remaining}<span className="text-xl">menit</span></div>
            <p className="text-sm text-muted-foreground mb-4">tersisa hari ini</p>
            <Button onClick={handleStart} disabled={starting} className="w-full rounded-full">
              <Play className="h-4 w-4 mr-1" /> {starting ? 'Memulai...' : 'Mulai Screen Time'}
            </Button>
          </Card>
        )}

        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">Pemakaian Hari Ini</span>
            <span className="text-sm text-muted-foreground">{used} / {totalAllowed} m</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
          </div>
          {(myLimit?.bonus_minutes || 0) > 0 && (
            <p className="text-xs text-accent font-bold mt-2">🎁 Bonus: {myLimit.bonus_minutes} menit (dari poin)</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-bold">Batas Harian</span></div>
          <p className="text-2xl font-extrabold">{myLimit?.daily_limit_minutes || 0} <span className="text-base font-normal text-muted-foreground">menit/hari</span></p>
          <p className="text-xs text-muted-foreground mt-1">Diatur oleh orang tua</p>
        </Card>
      </div>
    );
  }

  // PARENT VIEW
  return (
    <div className="px-5 pt-8 pb-24">
      <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Kembali
      </button>
      <h1 className="text-2xl font-extrabold mb-1">Kontrol Screen Time</h1>
      <p className="text-sm text-muted-foreground mb-6">Atur batas waktu layar anak-anak</p>

      {children.length === 0 && (
        <Card className="p-6 text-center"><p className="text-sm text-muted-foreground">Belum ada anggota anak di keluarga.</p></Card>
      )}

      <div className="space-y-4">
        {children.map((child) => {
          const limit = limits.find(l => l.member_id === child.id);
          const totalAllowed = (limit?.daily_limit_minutes || 0) + (limit?.bonus_minutes || 0);
          const used = limit?.used_today_minutes || 0;
          const remaining = Math.max(0, totalAllowed - used);
          const pct = totalAllowed > 0 ? Math.min(100, (used / totalAllowed) * 100) : 0;
          const isLocked = limit?.is_locked || remaining <= 0;

          return (
            <ChildLimitCard key={child.id} child={child} limit={limit} used={used} totalAllowed={totalAllowed} remaining={remaining} pct={pct} isLocked={isLocked} onSetLimit={handleSetLimit} onForceStop={handleForceStop} onSelect={() => setSelectedChild(child)} />
          );
        })}
      </div>
      <DeviceDetailDialog member={selectedChild} open={!!selectedChild} onOpenChange={(v) => !v && setSelectedChild(null)} />
    </div>
  );
}

function ChildLimitCard({ child, limit, used, totalAllowed, remaining, pct, isLocked, onSetLimit, onForceStop, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(limit?.daily_limit_minutes || 120);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <MemberAvatar member={child} size="md" />
        <div className="flex-1 cursor-pointer" onClick={onSelect}>
          <p className="font-bold flex items-center gap-1">{child.full_name} <Smartphone className="h-3 w-3 text-muted-foreground" /></p>
          <p className="text-xs text-muted-foreground capitalize">{child.family_role}</p>
        </div>
        {isLocked ? (
          <span className="flex items-center gap-1 text-xs font-bold text-destructive"><Lock className="h-3.5 w-3.5" /> Terkunci</span>
        ) : remaining <= 30 ? (
          <span className="flex items-center gap-1 text-xs font-bold text-accent"><AlertTriangle className="h-3.5 w-3.5" /> Hampir habis</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold text-primary"><Unlock className="h-3.5 w-3.5" /> Aktif</span>
        )}
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">Terpakai hari ini</span>
        <span className="text-xs font-bold">{used} / {totalAllowed} menit</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-3">
        <div className={`h-full transition-all ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>

      {(limit?.bonus_minutes || 0) > 0 && (
        <p className="text-xs text-accent font-bold mb-2">🎁 Bonus: {limit.bonus_minutes} menit</p>
      )}

      {editing ? (
        <div className="flex items-center gap-2">
          <Input type="number" min={0} max={600} value={val} onChange={(e) => setVal(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={() => { onSetLimit(child.id, parseInt(val) || 0); setEditing(false); }}>Simpan</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Batal</Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Batas: {limit?.daily_limit_minutes || 0} m/hari</p>
            <p className="text-xs text-muted-foreground">Sisa: {remaining} menit</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setVal(limit?.daily_limit_minutes || 120); setEditing(true); }}>Atur Batas</Button>
        </div>
      )}
    </Card>
  );
}
