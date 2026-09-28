import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { isParent, isChild } from '@/lib/familyConstants';
import { ArrowLeft, Plus, FileText, Check, PenLine } from 'lucide-react';

export default function Contracts() {
  const { member } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contracts, setContracts] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    if (!member) return;
    const { data } = await supabase.from('family_contracts').select('*').eq('family_id', member.family_id).order('created_at', { ascending: false }).limit(50);
    setContracts(data || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('contracts-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'family_contracts' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [member]);

  if (!member) return null;

  const sign = async (contract, type) => {
    try {
      const updates = { [type]: true };
      const otherAgreed = type === 'agreed_by_parents' ? contract.agreed_by_children : contract.agreed_by_parents;
      if (otherAgreed) updates.signed_at = new Date().toISOString();
      const { error } = await supabase.from('family_contracts').update(updates).eq('id', contract.id);
      if (error) throw error;
      toast({ title: 'Tanda tangan tercatat!' });
      load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    }
  };

  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Kontrak Keluarga</h1>
      </div>

      {isParent(member.family_role) && (
        <Button onClick={() => setCreateOpen(true)} className="w-full mb-4 rounded-full"><Plus className="h-4 w-4 mr-1" /> Buat Kontrak Baru</Button>
      )}

      <div className="space-y-3">
        {contracts.map((c) => {
          const fullySigned = c.agreed_by_parents && c.agreed_by_children;
          return (
            <Card key={c.id} className={fullySigned ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="font-bold flex-1">{c.title}</h3>
                  {fullySigned && <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold shrink-0">✓ Aktif</span>}
                </div>
                <ul className="space-y-1.5 mb-3">
                  {c.rules?.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2"><span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span><span>{r}</span></li>
                  ))}
                </ul>
                <div className="flex items-center gap-3 flex-wrap">
                  {isParent(member.family_role) && !c.agreed_by_parents && (
                    <Button size="sm" className="rounded-full" onClick={() => sign(c, 'agreed_by_parents')}><PenLine className="h-4 w-4 mr-1" /> Tandatangani</Button>
                  )}
                  {isChild(member.family_role) && !c.agreed_by_children && (
                    <Button size="sm" className="rounded-full" onClick={() => sign(c, 'agreed_by_children')}><PenLine className="h-4 w-4 mr-1" /> Saya Setuju</Button>
                  )}
                  {c.agreed_by_parents && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="h-3 w-3" /> Orang Tua</span>}
                  {c.agreed_by_children && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="h-3 w-3" /> Anak</span>}
                </div>
                {c.signed_at && <p className="text-xs text-muted-foreground mt-2">Disepakati {new Date(c.signed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
              </CardContent>
            </Card>
          );
        })}
        {contracts.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Belum ada kontrak. {isParent(member.family_role) ? 'Buat kontrak digital untuk menyepakati aturan keluarga bersama.' : 'Tunggu orang tua membuat kontrak.'}</p>}
      </div>

      {isParent(member.family_role) && <CreateContractDialog open={createOpen} onOpenChange={setCreateOpen} onDone={load} />}
    </div>
  );
}

function CreateContractDialog({ open, onOpenChange, onDone }) {
  const { member } = useFamily();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [rules, setRules] = useState(['']);
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!title.trim()) return toast({ variant: 'destructive', title: 'Judul wajib diisi' });
    const cleanRules = rules.map((r) => r.trim()).filter(Boolean);
    if (!cleanRules.length) return toast({ variant: 'destructive', title: 'Tambahkan minimal 1 aturan' });
    setSaving(true);
    try {
      const { error } = await supabase.from('family_contracts').insert({
        family_id: member.family_id,
        title: title.trim(),
        rules: cleanRules,
        agreed_by_parents: false,
        agreed_by_children: false,
        created_by_name: member.full_name,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: 'Kontrak dibuat!' });
      onOpenChange(false);
      setTitle(''); setRules(['']);
      onDone?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Buat Kontrak Digital</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Judul Kontrak</Label><Input placeholder="misal: Aturan Penggunaan Gadget" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Aturan</Label>
            {rules.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder={`Aturan ${i + 1}`} value={r} onChange={(e) => setRules(rules.map((rr, idx) => idx === i ? e.target.value : rr))} />
                {rules.length > 1 && <Button size="icon" variant="ghost" onClick={() => setRules(rules.filter((_, idx) => idx !== i))}><span className="text-lg leading-none">×</span></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setRules([...rules, ''])}><Plus className="h-4 w-4 mr-1" /> Tambah Aturan</Button>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button onClick={handle} disabled={saving}>{saving ? 'Menyimpan...' : 'Buat Kontrak'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
