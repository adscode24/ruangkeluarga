import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ROLE_LABELS } from '@/lib/familyConstants';
import { ArrowLeft, Trash2, Shield, User, LogOut, Pencil, UserCircle } from 'lucide-react';

export default function Settings() {
  const { member, family, user, refresh } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);

  if (!member) return null;

  const logout = async () => {
    await base44.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Pengaturan</h1>
      </div>

      <Card className="mb-4"><CardContent className="p-4 space-y-2.5">
        <div className="flex items-center gap-2 mb-1"><User className="h-4 w-4 text-primary" /><p className="font-bold text-sm">Profil</p></div>
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Nama</span><div className="flex items-center gap-1.5"><span className="text-sm font-bold">{member.full_name}</span><button onClick={() => setEditNameOpen(true)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button></div></div>
        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm font-bold truncate max-w-[60%]">{user?.email}</span></div>
        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Peran</span><span className="text-sm font-bold">{ROLE_LABELS[member.family_role]}</span></div>
        <div className="flex justify-between"><span className="text-sm text-muted-foreground">Keluarga</span><span className="text-sm font-bold">{family?.family_name}</span></div>
        {member.is_founder && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><span className="text-sm font-bold text-primary">Founder</span></div>}
      </CardContent></Card>

      <Button variant="outline" className="w-full mb-4 rounded-full" onClick={() => navigate('/avatar')}><UserCircle className="h-4 w-4 mr-1" /> Buat / Ubah Avatar</Button>

      <Card className="p-4 mb-4 border-primary/20 bg-primary/5"><CardContent className="p-0">
        <div className="flex items-center gap-2 mb-1"><Shield className="h-4 w-4 text-primary" /><p className="font-bold text-sm">Privasi & UU PDP</p></div>
        <p className="text-xs text-muted-foreground">Data keluarga Anda terisolasi & hanya dapat diakses anggota keluarga. Anda dapat menghapus seluruh data kapan saja.</p>
      </CardContent></Card>

      <Button variant="outline" className="w-full mb-4 rounded-full" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> Keluar</Button>

      {member.is_founder && (
        <Card className="p-4 border-destructive/30">
          <div className="flex items-center gap-2 mb-2"><Trash2 className="h-4 w-4 text-destructive" /><p className="font-bold text-sm text-destructive">Hapus Data Keluarga</p></div>
          <p className="text-xs text-muted-foreground mb-3">Menghapus seluruh data keluarga permanen: pesan, tugas, kontrak, poin, jadwal, dan anggota. Tidak dapat dibatalkan.</p>
          <Button variant="destructive" className="w-full rounded-full" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" /> Hapus Seluruh Data</Button>
        </Card>
      )}

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} familyName={family?.family_name} />

      <Card className="p-4 border-destructive/30 mt-4">
        <div className="flex items-center gap-2 mb-2"><Trash2 className="h-4 w-4 text-destructive" /><p className="font-bold text-sm text-destructive">Hapus Akun Saya</p></div>
        <p className="text-xs text-muted-foreground mb-3">Menghapus akun Anda permanen: profil anggota, pesan, poin, notifikasi, dan sesi waktu layar. Tidak dapat dibatalkan.</p>
        <Button variant="destructive" className="w-full rounded-full" onClick={() => setAccountDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" /> Hapus Akun Saya</Button>
      </Card>

      <AccountDeleteDialog open={accountDeleteOpen} onOpenChange={setAccountDeleteOpen} />
      <EditNameDialog open={editNameOpen} onOpenChange={setEditNameOpen} currentName={member.full_name} onDone={refresh} />
    </div>
  );
}

function EditNameDialog({ open, onOpenChange, currentName, onDone }) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handle = async () => {
    if (!name.trim()) return toast({ variant: 'destructive', title: 'Nama wajib diisi' });
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('updateProfile', { full_name: name.trim() });
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Nama diperbarui!' });
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ubah Nama</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Label>Nama Lengkap</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handle} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountDeleteDialog({ open, onOpenChange }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handle = async () => {
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('deleteMyAccount', {});
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Akun dihapus' });
      await base44.auth.logout();
      window.location.href = '/login';
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-destructive">Hapus Akun Saya</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">Tindakan ini permanen. Profil anggota, pesan, poin, notifikasi, dan sesi waktu layar Anda akan dihapus.</p>
          <p className="text-sm">Ketik <span className="font-bold">HAPUS</span> untuk konfirmasi:</p>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="HAPUS" />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => { onOpenChange(false); setConfirm(''); }}>Batal</Button><Button variant="destructive" onClick={handle} disabled={busy || confirm.trim() !== 'HAPUS'}>{busy ? 'Menghapus...' : 'Hapus Permanen'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ open, onOpenChange, familyName }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handle = async () => {
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('deleteFamilyData', { confirm: confirm.trim() });
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Data keluarga dihapus' });
      window.location.href = '/onboarding';
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-destructive">Konfirmasi Hapus Data</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">Tindakan ini permanen. Semua pesan, tugas, kontrak, poin, dan anggota akan dihapus.</p>
          <p className="text-sm">Ketik nama keluarga <span className="font-bold">{familyName}</span> untuk konfirmasi:</p>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={familyName} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => { onOpenChange(false); setConfirm(''); }}>Batal</Button><Button variant="destructive" onClick={handle} disabled={busy || confirm.trim() !== familyName}>{busy ? 'Menghapus...' : 'Hapus Permanen'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}