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
import { isParent, isChild } from '@/lib/familyConstants';
import { ArrowLeft, Plus, Check, Clock, Award, RotateCcw } from 'lucide-react';
import PullToRefresh from '@/components/family/PullToRefresh';

export default function Tasks() {
  const { member, members } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTasks = async () => {
    if (!member) return;
    const t = await base44.entities.FamilyTask.filter({ family_id: member.family_id }, '-created_date', 100);
    setTasks(t);
  };

  useEffect(() => {
    loadTasks();
    const unsub = base44.entities.FamilyTask.subscribe(() => loadTasks());
    return () => unsub();
  }, [member]);

  if (!member) return null;

  const children = members.filter((m) => isChild(m.family_role) && m.is_active);
  const pendingApproval = tasks.filter((t) => t.status === 'completed');
  const myTasks = isChild(member.family_role)
    ? tasks.filter((t) => (!t.assigned_to_id || t.assigned_to_id === member.id) && t.status !== 'approved')
    : tasks.filter((t) => t.status !== 'approved');

  const handleAction = async (task, action) => {
    try {
      const { data } = await base44.functions.invoke('completeTask', { task_id: task.id, action });
      if (data?.error) throw new Error(data.error);
      toast({ title: action === 'complete' ? 'Tugas diselesaikan!' : action === 'approve' ? 'Disetujui — poin diberikan!' : 'Tugas dikembalikan' });
      loadTasks();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    }
  };

  return (
    <PullToRefresh onRefresh={loadTasks}>
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Tugas & Tantangan</h1>
      </div>

      {isParent(member.family_role) && (
        <Button onClick={() => setCreateOpen(true)} className="w-full mb-4 rounded-full"><Plus className="h-4 w-4 mr-1" /> Buat Tugas Baru</Button>
      )}

      {isParent(member.family_role) && pendingApproval.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Menunggu Persetujuan ({pendingApproval.length})</h3>
          <div className="space-y-2">
            {pendingApproval.map((t) => (
              <Card key={t.id} className="p-3 border-accent/30 bg-accent/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.assigned_to_name || 'Semua anak'} · +{t.points_reward} poin</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" className="rounded-full h-11 w-11 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleAction(t, 'approve')}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" className="rounded-full h-11 w-11" onClick={() => handleAction(t, 'reject')}><RotateCcw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-bold mb-2">{isChild(member.family_role) ? 'Tugasku' : 'Tugas Aktif'}</h2>
      <div className="space-y-2">
        {myTasks.map((t) => (
          <Card key={t.id} className="p-3">
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${t.status === 'completed' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-bold text-accent">+{t.points_reward} poin</span>
                  {t.assigned_to_name && <span className="text-xs text-muted-foreground">· {t.assigned_to_name}</span>}
                  {t.status === 'completed' && <span className="text-xs text-accent font-semibold">✓ Menunggu approval</span>}
                </div>
              </div>
              {isChild(member.family_role) && t.status === 'pending' && (!t.assigned_to_id || t.assigned_to_id === member.id) && (
                <Button size="sm" className="rounded-full shrink-0" onClick={() => handleAction(t, 'complete')}><Check className="h-4 w-4 mr-1" /> Selesai</Button>
              )}
            </div>
          </Card>
        ))}
        {myTasks.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Belum ada tugas. {isParent(member.family_role) ? 'Buat tugas baru untuk anak!' : 'Tunggu orang tua menugaskan sesuatu 🎯'}</p>}
      </div>

      {isParent(member.family_role) && <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} children={children} onDone={loadTasks} />}
    </div>
    </PullToRefresh>
  );
}

function CreateTaskDialog({ open, onOpenChange, children, onDone }) {
  const { member } = useFamily();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('10');
  const [assignee, setAssignee] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!title.trim()) return toast({ variant: 'destructive', title: 'Judul wajib diisi' });
    setSaving(true);
    try {
      const assigneeMember = children.find((c) => c.id === assignee);
      await base44.entities.FamilyTask.create({
        family_id: member.family_id,
        title: title.trim(),
        description: description.trim(),
        points_reward: parseInt(points) || 10,
        assigned_to_id: assignee || '',
        assigned_to_name: assigneeMember?.full_name || '',
        status: 'pending',
        created_by_name: member.full_name,
      });
      toast({ title: 'Tugas dibuat!' });
      onOpenChange(false);
      setTitle(''); setDescription(''); setPoints('10'); setAssignee('');
      onDone?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Buat Tugas Baru</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Judul Tugas</Label><Input placeholder="misal: Kerjakan PR Matematika" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Deskripsi (opsional)</Label><Input placeholder="Detail tugas..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Hadiah Poin</Label><Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Ditugaskan ke</Label><Select value={assignee} onValueChange={setAssignee}><SelectTrigger><SelectValue placeholder="Semua anak" /></SelectTrigger><SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button onClick={handle} disabled={saving}>{saving ? 'Menyimpan...' : 'Buat Tugas'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}