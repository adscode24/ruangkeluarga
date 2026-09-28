import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MemberAvatar from '@/components/family/MemberAvatar';
import { ROLE_LABELS, ROLE_COLORS, ROOM_LABELS } from '@/lib/familyConstants';
import { Coins } from 'lucide-react';

export default function MembersPopup({ open, onOpenChange, members }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Semua Anggota Keluarga</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
              <MemberAvatar member={m} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{m.full_name}</p>
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[m.family_role] || 'bg-muted'}`}>{ROLE_LABELS[m.family_role]}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">📍 {ROOM_LABELS[m.current_location] || m.current_location || 'Ruang Keluarga'}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs font-bold text-accent"><Coins className="h-3 w-3" /> {m.points_balance || 0}</div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}