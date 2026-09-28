import { useState, useEffect } from 'react';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import MemberAvatar from '@/components/family/MemberAvatar';
import RoleBadge from '@/components/family/RoleBadge';
import LocationPicker from '@/components/family/LocationPicker';
import ThemeToggle from '@/components/family/ThemeToggle';
import AnalysisDialog from '@/components/family/AnalysisDialog';
import { ROOM_LABELS, ROOM_EMOJI, isParent, isChild, ROLE_OPTIONS, ROLE_LABELS } from '@/lib/familyConstants';
import { Mail, Move, Coins, Send, Clock, Copy, UserCog } from 'lucide-react';

export default function FamilyMembers() {
  const { user, member, family, members, refresh } = useFamily();
  const { toast } = useToast();
  const [pickerMember, setPickerMember] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('kakak');
  const [sending, setSending] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [roleMember, setRoleMember] = useState(null);

  const loadInvitations = async () => {
    if (!member) return;
    const invs = await base44.entities.FamilyInvitation.filter({ family_id: member.family_id, status: 'pending' }, '-created_date', 50);
    setInvitations(invs);
  };

  useEffect(() => {
    loadInvitations();
    const unsub = base44.entities.FamilyInvitation.subscribe(() => loadInvitations());
    return () => unsub();
  }, [member]);

  if (!member) return null;

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return toast({ variant: 'destructive', title: 'Email wajib diisi' });
    setSending(true);
    try {
      const { data } = await base44.functions.invoke('inviteMember', { email: inviteEmail.trim(), role: inviteRole });
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Undangan terkirim!', description: `Email undangan dikirim ke ${inviteEmail.trim()}` });
      setInviteEmail('');
      loadInvitations();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal mengundang', description: e.message });
    } finally { setSending(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(family?.invite_code || '');
    toast({ title: 'Kode disalin', description: family?.invite_code });
  };

  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold">Keluarga</h1>
          <p className="text-sm text-muted-foreground">{family?.family_name}</p>
        </div>
        <ThemeToggle />
      </div>

      {isParent(member.family_role) && (
        <Card className="p-4 mb-4 bg-gradient-to-br from-accent/15 to-accent/5 border-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-accent" />
            <p className="font-bold text-sm">Undang Anggota via Email</p>
          </div>
          <div className="space-y-2">
            <Input type="email" placeholder="email@keluarga.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <div className="flex gap-2">
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={sendInvite} disabled={sending} className="rounded-full shrink-0"><Send className="h-4 w-4 mr-1" />{sending ? '...' : 'Kirim'}</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Anggota akan menerima email undangan. Mereka mendaftar dengan email tersebut, lalu undangan diterima otomatis di onboarding.</p>
        </Card>
      )}

      {isParent(member.family_role) && (
        <button onClick={() => setAnalysisOpen(true)} className="mb-4 w-full rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 text-left flex items-center gap-3 hover:shadow-md active:scale-[0.98] transition-all">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-xl shrink-0">🧠</div>
          <div>
            <p className="font-bold text-sm">Analisis Komunikasi AI</p>
            <p className="text-xs text-muted-foreground">Deteksi pola cyberbullying & kesehatan komunikasi</p>
          </div>
        </button>
      )}

      {invitations.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Undangan Menunggu ({invitations.length})</h3>
          <div className="space-y-1.5">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-sm shrink-0">✉️</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">sebagai {ROLE_LABELS[inv.role]} · oleh {inv.invited_by_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={copyCode} className="mb-4 w-full rounded-xl bg-muted/60 p-3 flex items-center justify-between hover:bg-muted transition-colors">
        <div className="text-left">
          <p className="text-xs text-muted-foreground">Kode undangan (alternatif)</p>
          <code className="font-bold tracking-widest">{family?.invite_code}</code>
        </div>
        <Copy className="h-4 w-4 text-muted-foreground" />
      </button>

      <h2 className="font-bold mb-2">Anggota ({members.length})</h2>
      <div className="space-y-2">
        {members.map((m) => (
          <Card key={m.id} className="p-3 flex items-center gap-3">
            <MemberAvatar member={m} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold truncate">{m.full_name}</p>
                {m.is_founder && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold shrink-0">Founder</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleBadge role={m.family_role} />
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">{ROOM_EMOJI[m.current_location]} {m.current_location === 'luar_rumah' ? (m.outside_location_name || 'Luar') : ROOM_LABELS[m.current_location]}</span>
              </div>
              {isChild(m.family_role) && <p className="text-xs font-bold text-accent mt-0.5 flex items-center gap-1"><Coins className="h-3 w-3" /> {m.points_balance || 0} poin</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(isParent(member.family_role) || m.user_id === user.id) && (
                <Button size="icon" variant="ghost" className="rounded-full shrink-0" onClick={() => setPickerMember(m)}><Move className="h-4 w-4" /></Button>
              )}
              {isParent(member.family_role) && (
                <Button size="icon" variant="ghost" className="rounded-full shrink-0" onClick={() => setRoleMember(m)}><UserCog className="h-4 w-4" /></Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {pickerMember && <LocationPicker member={pickerMember} open={!!pickerMember} onOpenChange={(v) => !v && setPickerMember(null)} onDone={refresh} />}
      <AnalysisDialog open={analysisOpen} onOpenChange={setAnalysisOpen} />
      <RoleChangeDialog member={roleMember} open={!!roleMember} onOpenChange={(v) => !v && setRoleMember(null)} onDone={refresh} />
    </div>
  );
}

function RoleChangeDialog({ member, open, onOpenChange, onDone }) {
  const { toast } = useToast();
  const [newRole, setNewRole] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (member) setNewRole(member.family_role);
  }, [member]);

  const handle = async () => {
    if (!member || !newRole) return;
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('updateMemberRole', { member_id: member.id, new_role: newRole });
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Peran diubah!', description: `${member.full_name} sekarang ${ROLE_LABELS[newRole]}` });
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ubah Peran Anggota</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Mengubah peran <span className="font-bold">{member?.full_name}</span> dari <span className="font-bold">{ROLE_LABELS[member?.family_role]}</span> ke:</p>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handle} disabled={busy || newRole === member?.family_role}>{busy ? 'Menyimpan...' : 'Simpan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}