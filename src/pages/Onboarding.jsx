import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { auth } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Home, Users, MessageCircle, Shield, Mail, Check } from 'lucide-react';
import { ROLE_OPTIONS } from '@/lib/familyConstants';

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState(null);

  const [createForm, setCreateForm] = useState({ family_name: '', full_name: '', family_role: 'ayah' });
  const [joinForm, setJoinForm] = useState({ invite_code: '', full_name: '', family_role: 'kakak' });

  useEffect(() => {
    auth.me().then(async (u) => {
      if (u?.role === 'admin' && !u?.family_id) { navigate('/admin', { replace: true }); return; }
      if (u?.family_id) {
        try {
          const { data: members } = await supabase.from('family_members').select('*').eq('user_id', u.id);
          if (members?.length > 0) { navigate('/', { replace: true }); return; }
          await auth.updateMe({ family_id: null });
        } catch (e) { navigate('/', { replace: true }); return; }
      }
      try {
        const { data, error } = await supabase.functions.invoke('checkInvitation', { body: {} });
        if (!error && data?.has_invitation) setInvitation(data);
      } catch (e) { /* ignore */ }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, [navigate]);

  const handleCreate = async () => {
    if (!createForm.family_name.trim()) return toast({ variant: 'destructive', title: 'Nama keluarga wajib diisi' });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('createFamily', { body: createForm });
      if (error) throw error;
      toast({ title: 'Ruang Keluarga dibuat!', description: `Kode undangan: ${data.invite_code}` });
      window.location.href = '/';
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal membuat keluarga', description: e.message });
    } finally { setBusy(false); }
  };

  const handleJoin = async () => {
    if (!joinForm.invite_code.trim()) return toast({ variant: 'destructive', title: 'Kode undangan wajib diisi' });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('joinFamily', { body: joinForm });
      if (error) throw error;
      toast({ title: 'Berhasil bergabung!' });
      window.location.href = '/';
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal bergabung', description: e.message });
    } finally { setBusy(false); }
  };

  const handleAccept = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('acceptInvitation', {
        body: {
          invitation_id: invitation.invitation_id,
          full_name: joinForm.full_name || invitation.invited_by || '',
        },
      });
      if (error) throw error;
      toast({ title: 'Berhasil bergabung!', description: `Selamat datang di ${invitation.family_name}` });
      window.location.href = '/';
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setBusy(false); }
  };

  if (checking) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-accent/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/20 via-background to-background">
      <div className="max-w-md mx-auto px-5 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-primary text-primary-foreground text-4xl mb-4 shadow-lg shadow-primary/20">🏡</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Ruang Keluarga</h1>
          <p className="text-muted-foreground mt-2 text-sm">Rumah digital untuk keluarga Anda — bukan pengawasan, tapi kolaborasi.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
          {[
            { icon: Home, label: 'Rumah Virtual' },
            { icon: MessageCircle, label: 'Chat per Ruang' },
            { icon: Shield, label: 'Privasi Terjaga' },
          ].map((f) => (
            <div key={f.label} className="rounded-2xl bg-card border border-border p-3">
              <f.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </div>

        {invitation && (
          <Card className="mb-5 border-primary/40 bg-primary/5 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary/15 text-primary"><Mail className="h-5 w-5" /></span>
                <div>
                  <p className="font-bold">Anda diundang!</p>
                  <p className="text-xs text-muted-foreground">oleh {invitation.invited_by}</p>
                </div>
              </div>
              <p className="text-sm mb-1">Bergabung ke <span className="font-bold">{invitation.family_name}</span> sebagai <span className="font-bold">{invitation.role_label}</span>.</p>
              <div className="mt-3">
                <Label className="text-xs">Nama Anda (opsional)</Label>
                <Input placeholder="Nama lengkap" value={joinForm.full_name} onChange={(e) => setJoinForm({ ...joinForm, full_name: e.target.value })} className="mt-1" />
              </div>
              <Button onClick={handleAccept} disabled={busy} className="w-full mt-3 rounded-full h-11"><Check className="h-4 w-4 mr-1" /> Terima Undangan</Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-full">
            <TabsTrigger value="create" className="rounded-full">Buat Baru</TabsTrigger>
            <TabsTrigger value="join" className="rounded-full">Gabung dengan Kode</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="border-border shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" /> Buat Ruang Keluarga</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nama Ruang Keluarga</Label>
                  <Input placeholder="misal: Keluarga Budi" value={createForm.family_name} onChange={(e) => setCreateForm({ ...createForm, family_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nama Anda</Label>
                  <Input placeholder="Nama lengkap Anda" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Peran Anda</Label>
                  <Select value={createForm.family_role} onValueChange={(v) => setCreateForm({ ...createForm, family_role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={busy} className="w-full rounded-full h-11 text-base">Buat Rumah Digital</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="border-border shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageCircle className="h-5 w-5 text-primary" /> Gabung dengan Kode</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Kode Undangan</Label>
                  <Input placeholder="6 karakter" maxLength={6} className="uppercase tracking-widest text-center text-lg font-bold" value={joinForm.invite_code} onChange={(e) => setJoinForm({ ...joinForm, invite_code: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nama Anda</Label>
                  <Input placeholder="Nama lengkap Anda" value={joinForm.full_name} onChange={(e) => setJoinForm({ ...joinForm, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Peran Anda</Label>
                  <Select value={joinForm.family_role} onValueChange={(v) => setJoinForm({ ...joinForm, family_role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleJoin} disabled={busy} className="w-full rounded-full h-11 text-base">Gabung Sekarang</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
