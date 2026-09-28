import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Crown, Shield, Trash2, Mail, Clock, Wifi, WifiOff, Users, Pencil } from 'lucide-react';
import { ROLE_LABELS, ROLE_OPTIONS } from '@/lib/familyConstants';

export default function FamilyDetailDialog({ family, onOpenChange, onDone, onRequestDelete }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMembers, setEditMembers] = useState([]);

  if (!family) return null;
  const isPro = family.plan !== 'free' && family.status === 'active';

  const startEdit = () => {
    setEditName(family.name);
    setEditMembers(family.members.map((m) => ({ id: m.id, full_name: m.full_name, family_role: m.family_role })));
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const updateMember = (id, field, value) => setEditMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  const saveEdit = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('adminUpdateFamily', { body: { family_id: family.id, family_name: editName, members: editMembers } });
      if (error) throw error;
      toast({ title: 'Perubahan disimpan!' });
      setEditing(false); onDone(); onOpenChange(false);
    } catch (e) { toast({ variant: 'destructive', title: 'Gagal menyimpan', description: e.message }); } finally { setBusy(false); }
  };

  const setPlan = async (plan) => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('setFamilySubscription', { body: { family_id: family.id, plan } });
      if (error) throw error;
      toast({ title: 'Paket diperbarui!' }); onDone(); onOpenChange(false);
    } catch (e) { toast({ variant: 'destructive', title: 'Gagal', description: e.message }); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!family} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{editing ? <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-bold h-8" /> : family.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-muted/50 space-y-1.5">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Founder</span><span className="text-sm font-bold">{family.founder}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Bergabung</span><span className="text-sm">{new Date(family.created_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Status</span><Badge className={isPro ? 'bg-amber-500' : 'bg-slate-400'}>{isPro ? 'Pro' : 'Free'}</Badge></div>
          </div>
          <div>
            <p className="text-sm font-bold mb-2">Anggota ({family.members.length})</p>
            <div className="space-y-2">
              {family.members.map((m) => {
                const em = editMembers.find((x) => x.id === m.id);
                return (
                  <div key={m.id} className="p-3 rounded-xl border">
                    <div className="flex items-center justify-between mb-1">
                      {editing && em ? <Input value={em.full_name} onChange={(e) => updateMember(m.id, 'full_name', e.target.value)} className="font-bold text-sm h-8" /> : <p className="font-bold text-sm">{m.full_name}</p>}
                      {m.is_online ? <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold"><Wifi className="h-3 w-3" /> Online</span> : <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><WifiOff className="h-3 w-3" /> Offline</span>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {m.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {editing && em ? <Select value={em.family_role} onValueChange={(v) => updateMember(m.id, 'family_role', v)}><SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[m.family_role]}</Badge>}
                      {m.is_founder && <Badge variant="secondary" className="text-[10px]">Founder</Badge>}
                      {m.last_active && <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto"><Clock className="h-3 w-3" /> {new Date(m.last_active).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
                );
              })}
              {family.members.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Tidak ada anggota</p>}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold mb-2">Langganan</p>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy || editing} onClick={() => setPlan('premium_yearly')} className={`p-4 rounded-2xl border-2 text-center ${isPro ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-border'}`}><Crown className="h-7 w-7 mx-auto mb-1 text-amber-500" /><p className="font-bold text-sm">Pro</p></button>
              <button disabled={busy || editing} onClick={() => setPlan('free')} className={`p-4 rounded-2xl border-2 text-center ${!isPro ? 'border-slate-400 bg-slate-50 dark:bg-slate-900/30' : 'border-border'}`}><Shield className="h-7 w-7 mx-auto mb-1 text-slate-500" /><p className="font-bold text-sm">Free</p></button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2">
          {editing ? <><Button onClick={saveEdit} disabled={busy} className="w-full">Simpan</Button><Button variant="outline" onClick={cancelEdit} disabled={busy} className="w-full">Batal</Button></> : <><Button onClick={startEdit} disabled={busy} className="w-full"><Pencil className="h-4 w-4 mr-1" /> Edit</Button><Button variant="destructive" onClick={() => onRequestDelete(family.id)} disabled={busy} className="w-full"><Trash2 className="h-4 w-4 mr-1" /> Hapus</Button><Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="w-full">Tutup</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
