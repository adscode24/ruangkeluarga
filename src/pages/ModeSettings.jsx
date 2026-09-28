import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { isParent, ROOM_LABELS } from '@/lib/familyConstants';
import { ArrowLeft, Plus, Clock, Trash2, School, Moon, Calendar, Play } from 'lucide-react';

const DAYS = [
  { key: 'mon', label: 'Sen' }, { key: 'tue', label: 'Sel' }, { key: 'wed', label: 'Rab' },
  { key: 'thu', label: 'Kam' }, { key: 'fri', label: 'Jum' }, { key: 'sat', label: 'Sab' }, { key: 'sun', label: 'Min' }
];

const MODE_ICONS = { sekolah: School, ramadan: Moon, libur: Calendar, belajar: Clock };
const MODE_LABELS = { sekolah: 'Mode Sekolah', ramadan: 'Mode Ramadan', libur: 'Mode Libur', belajar: 'Mode Belajar' };
const LOC_OPTIONS = [
  { value: 'luar_rumah', label: 'Luar Rumah (Sekolah)' },
  { value: 'kamar_kakak', label: 'Kamar Kakak' },
  { value: 'kamar_adik', label: 'Kamar Adik' },
  { value: 'ruang_keluarga', label: 'Ruang Keluarga' },
];

export default function ModeSettings() {
  const { member } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = async () => {
    if (!member) return;
    const s = await base44.entities.FamilySchedule.filter({ family_id: member.family_id }, '-created_date', 50);
    setSchedules(s);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.FamilySchedule.subscribe(() => load());
    return () => unsub();
  }, [member]);

  if (!member) return null;
  if (!isParent(member.family_role)) {
    return (
      <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-2xl font-extrabold">Mode Otomatis</h1>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">Hanya orang tua yang dapat mengatur mode otomatis.</p>
      </div>
    );
  }

  const toggleActive = async (s) => {
    await base44.entities.FamilySchedule.update(s.id, { is_active: !s.is_active });
    load();
  };

  const remove = async (s) => {
    await base44.entities.FamilySchedule.delete(s.id);
    toast({ title: 'Jadwal dihapus' });
    load();
  };

  const applyNow = async () => {
    setApplying(true);
    try {
      const { data } = await base44.functions.invoke('applyFamilyMode', { family_id: member.family_id });
      if (data?.error) throw new Error(data.error);
      if (data.applied) toast({ title: `Mode ${data.label} diterapkan`, description: `${data.moved} anak dipindahkan` });
      else toast({ title: 'Tidak ada jadwal yang cocok saat ini' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setApplying(false); }
  };

  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Mode Otomatis</h1>
      </div>

      <Card className="p-3 mb-4 bg-primary/5 border-primary/20">
        <p className="text-xs text-muted-foreground">Pindahkan anak ke lokasi tertentu pada jam & hari yang ditentukan (mis. Mode Sekolah 07:00–15:00 Sen–Jum). Ketuk "Terapkan Sekarang" untuk uji coba, atau aktifkan workflow terjadwal untuk otomatis.</p>
      </Card>

      <div className="flex gap-2 mb-4">
        <Button onClick={() => setCreateOpen(true)} className="flex-1 rounded-full"><Plus className="h-4 w-4 mr-1" /> Buat Jadwal</Button>
        <Button variant="outline" className="rounded-full" onClick={applyNow} disabled={applying || schedules.length === 0}><Play className="h-4 w-4 mr-1" /> Terapkan</Button>
      </div>

      <div className="space-y-3">
        {schedules.map((s) => {
          const Icon = MODE_ICONS[s.mode] || Clock;
          return (
            <Card key={s.id} className={`p-4 ${s.is_active ? 'border-primary/30' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{s.label || MODE_LABELS[s.mode]}</p>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{MODE_LABELS[s.mode]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.start_time} – {s.end_time}</p>
                  <div className="flex gap-1 mt-1.5">
                    {DAYS.map((d) => (
                      <span key={d.key} className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${s.days?.includes(d.key) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{d.label[0]}</span>
                    ))}
                  </div>
                  <p className="text-xs mt-1.5">→ {s.auto_location === 'luar_rumah' ? (s.outside_label || 'Luar') : ROOM_LABELS[s.auto_location]}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(s)} className={`w-10 h-5 rounded-full transition-colors ${s.is_active ? 'bg-primary' : 'bg-muted'}`}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${s.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
                  <button onClick={() => remove(s)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </Card>
          );
        })}
        {schedules.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Belum ada jadwal mode. Buat untuk otomatisasi lokasi anak.</p>}
      </div>

      <CreateScheduleDialog open={createOpen} onOpenChange={setCreateOpen} onDone={load} />
    </div>
  );
}

function CreateScheduleDialog({ open, onOpenChange, onDone }) {
  const { member } = useFamily();
  const { toast } = useToast();
  const [mode, setMode] = useState('sekolah');
  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [days, setDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [autoLocation, setAutoLocation] = useState('luar_rumah');
  const [outsideLabel, setOutsideLabel] = useState('Sekolah');
  const [saving, setSaving] = useState(false);

  const toggleDay = (k) => setDays(days.includes(k) ? days.filter((d) => d !== k) : [...days, k]);

  const handle = async () => {
    if (!days.length) return toast({ variant: 'destructive', title: 'Pilih minimal 1 hari' });
    setSaving(true);
    try {
      await base44.entities.FamilySchedule.create({
        family_id: member.family_id,
        mode, label: label.trim() || MODE_LABELS[mode],
        start_time: startTime, end_time: endTime, days,
        auto_location: autoLocation,
        outside_label: autoLocation === 'luar_rumah' ? outsideLabel.trim() : '',
        is_active: true,
        created_by_name: member.full_name,
      });
      toast({ title: 'Jadwal mode dibuat!' });
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Buat Jadwal Mode Otomatis</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Mode</Label><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MODE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Nama (opsional)</Label><Input placeholder={MODE_LABELS[mode]} value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Jam Mulai</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Jam Selesai</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Hari Aktif</Label>
            <div className="flex gap-1.5">
              {DAYS.map((d) => (
                <button key={d.key} type="button" onClick={() => toggleDay(d.key)} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${days.includes(d.key) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Lokasi Otomatis Anak</Label><Select value={autoLocation} onValueChange={setAutoLocation}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOC_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
          {autoLocation === 'luar_rumah' && <div className="space-y-1.5"><Label>Label Lokasi</Label><Input placeholder="misal: Sekolah" value={outsideLabel} onChange={(e) => setOutsideLabel(e.target.value)} /></div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button onClick={handle} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}