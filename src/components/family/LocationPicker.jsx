import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { ROOM_LABELS, ROOM_EMOJI, OUTSIDE_OPTIONS, canChangeOwnLocation, isParent } from '@/lib/familyConstants';
import { useFamily } from '@/lib/familyContext';

const ROOMS = ['ruang_keluarga', 'kamar_orang_tua', 'kamar_kakak', 'kamar_adik', 'luar_rumah'];

export default function LocationPicker({ member, open, onOpenChange, onDone }) {
  const { member: me } = useFamily();
  const { toast } = useToast();
  const [location, setLocation] = useState(member?.current_location || 'ruang_keluarga');
  const [outsideName, setOutsideName] = useState(member?.outside_location_name || '');
  const [saving, setSaving] = useState(false);

  const isSelf = me && member && me.user_id === member.user_id;
  const canEdit = isSelf ? canChangeOwnLocation(me?.family_role) : isParent(me?.family_role);

  if (!canEdit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tidak Diizinkan</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isSelf ? 'Lokasi Anda hanya dapat diatur oleh orang tua.' : 'Hanya orang tua yang dapat mengubah lokasi anggota lain.'}
          </p>
          <DialogFooter><Button onClick={() => onOpenChange(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('updateMemberLocation', {
        body: { member_id: member.id, location, outside_location_name: location === 'luar_rumah' ? outsideName : '' },
      });
      if (error) throw error;
      toast({ title: 'Lokasi diperbarui', description: `Sekarang di ${ROOM_LABELS[location]}` });
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pindah Ruang — {member?.full_name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {ROOMS.map((r) => (
            <button key={r} type="button" onClick={() => setLocation(r)} className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all ${location === r ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}>
              <span className="text-2xl">{ROOM_EMOJI[r]}</span>
              <span className="text-xs font-semibold">{ROOM_LABELS[r]}</span>
            </button>
          ))}
        </div>
        {location === 'luar_rumah' && (
          <div className="space-y-2">
            <Label>Lokasi di luar rumah</Label>
            <div className="flex flex-wrap gap-2">
              {OUTSIDE_OPTIONS.map((o) => (
                <button key={o} type="button" onClick={() => setOutsideName(o)} className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${outsideName === o ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}>{o}</button>
              ))}
            </div>
            <Input placeholder="Atau ketik lokasi lain..." value={outsideName} onChange={(e) => setOutsideName(e.target.value)} />
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button onClick={handleSave} disabled={saving || (location === 'luar_rumah' && !outsideName.trim())}>{saving ? 'Menyimpan...' : 'Pindah'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
