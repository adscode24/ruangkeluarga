import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/api/supabaseClient';
import { auth } from '@/api/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Users, Home as HomeIcon, Crown, Shield, Trash2, Mail, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import FamilyDetailDialog from '@/components/family/admin/FamilyDetailDialog';
import { ROLE_LABELS } from '@/lib/familyConstants';

export default function AdminDashboard() {
  const { user } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { navigate('/', { replace: true }); return; }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('getAdminStats', { body: {} });
      if (error) throw error;
      setStats(data);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal memuat data', description: e.message });
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('adminDeleteFamily', { body: { family_ids: selectedIds } });
      if (error) throw error;
      toast({ title: 'Keluarga dihapus', description: `${selectedIds.length} keluarga dan seluruh datanya telah dihapus.` });
      setConfirmDelete(false);
      setSelectedFamily(null);
      setSelectedIds([]);
      setDeleteMode(false);
      loadStats();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal menghapus', description: e.message });
    } finally { setDeleting(false); }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const requestDelete = (ids) => {
    setSelectedFamily(null);
    setSelectedIds(ids);
    setConfirmDelete(true);
  };

  if (!user || user.role !== 'admin') return null;
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!stats) return null;

  const handleBack = () => {
    if (user?.family_id) {
      navigate('/');
    } else {
      auth.logout();
    }
  };

  const proFamilies = stats.families.filter((f) => f.plan !== 'free' && f.status === 'active');
  const freeFamilies = stats.families.filter((f) => f.plan === 'free' || f.status !== 'active');

  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-20 min-h-screen bg-gradient-to-b from-accent/10 via-background to-background">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={handleBack} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-extrabold">Rumah Pak RT</h1>
          <p className="text-xs text-muted-foreground">Dashboard Pengelola Aplikasi</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={HomeIcon} label="Kartu Keluarga" value={stats.totals.families} color="text-primary" onClick={() => setPopup('families')} />
        <StatCard icon={Users} label="Kartu Anggota" value={stats.totals.members} color="text-blue-500" onClick={() => setPopup('users')} />
        <StatCard icon={Crown} label="Pro" value={stats.totals.premium} color="text-amber-500" onClick={() => setPopup('pro')} />
        <StatCard icon={Shield} label="Free" value={stats.totals.free} color="text-slate-500" onClick={() => setPopup('free')} />
      </div>

      {/* Daftar Keluarga Accordion */}
      <Accordion type="single" collapsible className="mb-4">
        <AccordionItem value="families" className="border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-bold hover:no-underline py-4">
            <div className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5 text-primary" />
              Daftar Keluarga
              <Badge variant="secondary" className="ml-1">{stats.families.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center justify-between mb-3 pt-2">
              <span className="text-xs text-muted-foreground">{deleteMode ? 'Pilih keluarga untuk dihapus' : 'Klik keluarga untuk detail'}</span>
              <Button variant={deleteMode ? 'destructive' : 'outline'} size="sm" onClick={() => { setDeleteMode(!deleteMode); setSelectedIds([]); }}>
                {deleteMode ? 'Batal' : <><Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Data</>}
              </Button>
            </div>
            {deleteMode && selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" className="w-full mb-3" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Hapus {selectedIds.length} Keluarga Terpilih
              </Button>
            )}
            <div className="space-y-2">
              {stats.families.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada keluarga</p>}
              {stats.families.map((f) => (
                <div
                  key={f.id}
                  className={`p-3 rounded-xl border bg-card transition-all select-none ${deleteMode ? 'cursor-pointer' : 'cursor-pointer active:scale-[0.98]'}`}
                  onClick={() => (deleteMode ? toggleSelect(f.id) : setSelectedFamily(f))}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {deleteMode && <Checkbox checked={selectedIds.includes(f.id)} className="mr-1 pointer-events-none" />}
                        <p className="font-bold text-sm truncate">{f.name}</p>
                        {f.plan !== 'free' && f.status === 'active' && <Badge className="bg-amber-500 text-[10px] shrink-0">PRO</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">Founder: {f.founder}</p>
                      <p className="text-xs text-muted-foreground">Bergabung: {new Date(f.created_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {f.founder_is_online ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold"><Wifi className="h-3 w-3" /> Online</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><WifiOff className="h-3 w-3" /> Offline</span>
                        )}
                        {f.founder_last_active && (
                          <span className="text-[10px] text-muted-foreground">· {new Date(f.founder_last_active).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                    {!deleteMode && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Families Popup */}
      <Dialog open={popup === 'families'} onOpenChange={(v) => !v && setPopup(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><HomeIcon className="h-5 w-5 text-primary" /> Seluruh Keluarga</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {stats.families.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada keluarga</p>}
            {stats.families.map((f) => <PopupFamilyRow key={f.id} family={f} />)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Users Popup */}
      <Dialog open={popup === 'users'} onOpenChange={(v) => !v && setPopup(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Seluruh Anggota</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {stats.allUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada anggota</p>}
            {stats.allUsers.map((u) => (
              <div key={u.id} className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-sm">{u.full_name}</p>
                  {u.is_online ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold"><Wifi className="h-3 w-3" /> Online</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><WifiOff className="h-3 w-3" /> Offline</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-muted-foreground">{u.family_name || 'Tanpa Keluarga'}</span>
                  {u.family_role && <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[u.family_role]}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pro Popup */}
      <Dialog open={popup === 'pro'} onOpenChange={(v) => !v && setPopup(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Keluarga Pro</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {proFamilies.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada keluarga Pro</p>}
            {proFamilies.map((f) => <PopupFamilyRow key={f.id} family={f} />)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Free Popup */}
      <Dialog open={popup === 'free'} onOpenChange={(v) => !v && setPopup(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-slate-500" /> Keluarga Free</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {freeFamilies.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada keluarga Free</p>}
            {freeFamilies.map((f) => <PopupFamilyRow key={f.id} family={f} />)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Family Detail Dialog */}
      <FamilyDetailDialog
        family={selectedFamily}
        onOpenChange={(v) => !v && setSelectedFamily(null)}
        onDone={loadStats}
        onRequestDelete={(id) => requestDelete([id])}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.length} Keluarga?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus seluruh data keluarga terpilih beserta pesan, tugas, poin, dan pengaturan. Anggota keluarga akan kehilangan akses ke aplikasi. Ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <Card className="p-3 cursor-pointer active:scale-[0.98] transition-transform select-none" onClick={onClick}>
      <Icon className={`h-4 w-4 mb-1 ${color}`} />
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function PopupFamilyRow({ family }) {
  return (
    <div className="p-3 rounded-xl bg-muted/50">
      <div className="flex items-center justify-between mb-1">
        <p className="font-bold text-sm">{family.name}</p>
        {family.plan !== 'free' && family.status === 'active' && <Badge className="bg-amber-500 text-[10px]">PRO</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">Founder: {family.founder}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">{family.member_count} anggota</span>
        {family.founder_is_online ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold"><Wifi className="h-3 w-3" /> Online</span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><WifiOff className="h-3 w-3" /> Offline</span>
        )}
      </div>
    </div>
  );
}
