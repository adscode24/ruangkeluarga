import { useState, useEffect } from 'react';
import { useFamily } from '@/lib/familyContext';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MemberAvatar from '@/components/family/MemberAvatar';
import RoleBadge from '@/components/family/RoleBadge';
import AwardDialog from '@/components/family/AwardDialog';
import RedeemDialog from '@/components/family/RedeemDialog';
import { isParent, isChild, canApprovePoints } from '@/lib/familyConstants';
import { Coins, Plus, Check, X, ArrowDownCircle, ArrowUpCircle, Gift } from 'lucide-react';
import PullToRefresh from '@/components/family/PullToRefresh';

const STATUS_LABELS = { approved: 'Disetujui', rejected: 'Ditolak', completed: 'Selesai', pending: 'Menunggu' };

export default function Wallet() {
  const { member, members, refresh } = useFamily();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [awardOpen, setAwardOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const loadTxns = async () => {
    if (!member) return;
    const { data } = await supabase.from('point_transactions').select('*').eq('family_id', member.family_id).order('created_at', { ascending: false }).limit(100);
    setTransactions(data || []);
  };

  useEffect(() => {
    loadTxns();
    const ch = supabase.channel('txns-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'point_transactions' }, () => loadTxns()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [member]);

  if (!member) return null;

  const pending = transactions.filter((t) => t.status === 'pending');
  const children = members.filter((m) => isChild(m.family_role) && m.is_active);
  const history = transactions.filter((t) => t.status !== 'pending').slice(0, 30);

  const handleApprove = async (t, decision) => {
    try {
      const { error } = await supabase.functions.invoke('approvePointTransaction', { body: { transaction_id: t.id, action: decision } });
      if (error) throw error;
      toast({ title: decision === 'approved' ? 'Disetujui' : 'Ditolak' });
      loadTxns(); refresh();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    }
  };

  return (
    <PullToRefresh onRefresh={loadTxns}>
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-extrabold mb-4">Dompet Poin</h1>

      <Card className="p-6 mb-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg shadow-primary/20">
        <p className="text-sm opacity-80 mb-1">{isChild(member.family_role) ? 'Saldo Poin Anda' : 'Poin Anak'}</p>
        {isChild(member.family_role) ? (
          <div className="text-5xl font-extrabold">{member.points_balance || 0}</div>
        ) : (
          <div className="space-y-1.5 mt-1">
            {children.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-sm">{c.full_name}</span>
                <span className="font-bold text-lg">{c.points_balance || 0}</span>
              </div>
            ))}
            {children.length === 0 && <p className="text-sm opacity-70">Belum ada anggota anak</p>}
          </div>
        )}
      </Card>

      <div className="flex gap-2 mb-5">
        {isChild(member.family_role) && (
          <Button onClick={() => setRedeemOpen(true)} className="flex-1 rounded-full"><Gift className="h-4 w-4 mr-1" /> Tukar Poin</Button>
        )}
        {canApprovePoints(member.family_role) && (
          <Button onClick={() => setAwardOpen(true)} variant="secondary" className="flex-1 rounded-full"><Plus className="h-4 w-4 mr-1" /> Beri Poin</Button>
        )}
      </div>

      {canApprovePoints(member.family_role) && pending.length > 0 && (
        <div className="mb-5">
          <h2 className="font-bold mb-2 flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> Menunggu Persetujuan ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-2xl border border-accent/30 bg-accent/5">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{t.user_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                  <p className="text-sm font-bold text-accent">{Math.abs(t.points)} poin → {t.type === 'redeemed_for_cash' ? `Rp ${(t.cash_amount || 0).toLocaleString('id-ID')}` : 'Waktu Layar'}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" className="rounded-full h-11 w-11 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleApprove(t, 'approved')}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="destructive" className="rounded-full h-11 w-11" onClick={() => handleApprove(t, 'rejected')}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-bold mb-2">Riwayat</h2>
      <div className="space-y-2">
        {history.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${t.points > 0 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'}`}>
              {t.points > 0 ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{t.description}</p>
              <p className="text-xs text-muted-foreground">{t.user_name} · {STATUS_LABELS[t.status]}</p>
            </div>
            <div className={`font-bold shrink-0 ${t.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>{t.points > 0 ? '+' : ''}{t.points}</div>
          </div>
        ))}
        {history.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Belum ada transaksi</p>}
      </div>

      <AwardDialog open={awardOpen} onOpenChange={setAwardOpen} children={children} onDone={loadTxns} />
      <RedeemDialog open={redeemOpen} onOpenChange={setRedeemOpen} balance={member.points_balance || 0} onDone={loadTxns} />
    </div>
    </PullToRefresh>
  );
}
