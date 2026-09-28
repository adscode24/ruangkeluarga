import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import MemberAvatar from '@/components/family/MemberAvatar';

export default function AwardDialog({ open, onOpenChange, children, onDone }) {
  const { toast } = useToast();
  const [memberId, setMemberId] = useState('');
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('earned');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!memberId) return toast({ variant: 'destructive', title: 'Pilih anggota' });
    if (!points || parseInt(points) <= 0) return toast({ variant: 'destructive', title: 'Jumlah poin tidak valid' });
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke('awardPoints', { member_id: memberId, points: parseInt(points), description, type });
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Poin diberikan!', description: `+${points} poin` });
      onOpenChange(false);
      setMemberId(''); setPoints(''); setDescription(''); setType('earned');
      onDone?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Beri Poin ke Anak</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Pilih Anggota</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Pilih anak..." /></SelectTrigger>
              <SelectContent>
                {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jumlah Poin</Label>
              <Input type="number" placeholder="10" value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="earned">Poin Tugas</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Input placeholder="misal: Menyelesaikan PR matematika" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handle} disabled={saving}>{saving ? 'Memproses...' : 'Beri Poin'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}