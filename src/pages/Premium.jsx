import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Crown, Check, Loader2, Sparkles, Box, User, Sofa } from 'lucide-react';

const PLANS = [
  { id: 'premium_monthly', label: 'Bulanan', price: 'Rp 29.000', period: '/bulan', features: ['Mode 3D Free-Roam', 'Avatar kustom', 'Furnitur rumah', 'Laporan AI tanpa batas'] },
  { id: 'premium_yearly', label: 'Tahunan', price: 'Rp 290.000', period: '/tahun', badge: 'Hemat 2 bulan', features: ['Semua fitur Bulanan', 'Prioritas dukungan', 'Mode sekolah & Ramadan otomatis'] },
];

export default function Premium() {
  const { member, isPremium, refresh } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') toast({ title: 'Pembayaran berhasil!', description: 'Fitur Premium aktif' });
    if (status === 'canceled') toast({ variant: 'destructive', title: 'Pembayaran dibatalkan' });
    if (status) refresh();
  }, [searchParams]);

  const subscribe = async (planId) => {
    setLoading(planId);
    try {
      const { data } = await base44.functions.invoke('createCheckoutSession', { plan: planId });
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setLoading(null); }
  };

  if (!member) return null;

  return (
    <div className="px-5 pt-8 pb-20">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Premium</h1>
      </div>

      {isPremium && (
        <Card className="p-4 mb-5 bg-gradient-to-br from-amber-400/20 to-primary/10 border-amber-400/40">
          <div className="flex items-center gap-2 mb-1"><Crown className="h-5 w-5 text-amber-500" /><p className="font-bold text-amber-700 dark:text-amber-400">Anda member Premium</p></div>
          <p className="text-xs text-muted-foreground">Semua fitur premium aktif untuk keluarga Anda.</p>
        </Card>
      )}

      <Card className="p-4 mb-5 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-center gap-2 mb-2"><Sparkles className="h-5 w-5 text-primary" /><p className="font-bold">Buka Potensi Penuh</p></div>
        <p className="text-xs text-muted-foreground mb-3">Fitur dasar (tugas, kontrak, chat, poin) tetap gratis. Premium membuka fitur eksklusif:</p>
        <div className="grid grid-cols-3 gap-2">
          <Feature icon={Box} label="Mode 3D" />
          <Feature icon={User} label="Avatar" />
          <Feature icon={Sofa} label="Furnitur" />
        </div>
      </Card>

      <div className="space-y-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={`p-4 ${p.id === 'premium_yearly' ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-lg">{p.label}</p>
                <p className="text-2xl font-extrabold text-primary">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.period}</span></p>
              </div>
              {p.badge && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded-full font-bold">{p.badge}</span>}
            </div>
            <div className="space-y-1 mb-3">
              {p.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> {f}</div>
              ))}
            </div>
            <Button onClick={() => subscribe(p.id)} disabled={loading === p.id || isPremium} className="w-full rounded-full">
              {loading === p.id ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Memproses...</> : isPremium ? 'Aktif' : `Pilih ${p.label}`}
            </Button>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">Pembayaran aman via Stripe. Batalkan kapan saja.</p>
    </div>
  );
}

function Feature({ icon: Icon, label }) {
  return (
    <div className="text-center">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1"><Icon className="h-5 w-5 text-primary" /></div>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}