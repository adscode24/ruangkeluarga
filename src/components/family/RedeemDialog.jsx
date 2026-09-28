import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function RedeemDialog({ open, onOpenChange, balance, onDone }) {
  const { toast } = useToast();
  const [points, setPoints] = useState('');
  const [type, setType] = useState('redeemed_for_cash');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    const p = parseInt(points);
    if (!p || p <= 0) return toast({ variant: 'destructive', title: 'Jumlah poin tidak valid' });
    if (p > balance) return toast({ variant: 'destructive', title: 'Saldo poin tidak cukup' });
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke('requestRedemption', { points: p, type, description });
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Permintaan dikirim!', description: 'Menunggu persetujuan orang tua.' });
      onOpenChange(false);
      setPoints(''); setDescription(''); setType('redeemed_for_cash');
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
        <DialogHeader><DialogTitle>Tukar Poin</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl bg-accent/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Saldo Anda</p>
            <p className="text-3xl font-extrabold text-accent">{balance}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Tukar dengan</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="redeemed_for_cash">Uang Tunai</SelectItem>
                <SelectItem value="redeemed_for_screen_time">Waktu Layar Tambahan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Jumlah Poin</Label>
            <Input type="number" placeholder="50" max={balance} value={points} onChange={(e) => setPoints(e.target.value)} />
            {type === 'redeemed_for_cash' && points && parseInt(points) > 0 && (
              <p className="text-xs text-accent font-bold">≈ Rp {(parseInt(points) * 100).toLocaleString('id-ID')} <span className="font-normal text-muted-foreground">(1 poin = Rp 100)</span></p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Input placeholder="misal: Mau ditukar jadi uang jajan" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handle} disabled={saving}>{saving ? 'Memproses...' : 'Kirim Permintaan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}