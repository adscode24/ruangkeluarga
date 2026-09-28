import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ROOM_LABELS } from '@/lib/familyConstants';
import { ArrowLeft, Crown, Coins, ShoppingCart } from 'lucide-react';

const CATALOG = [
  { type: 'sofa', label: 'Sofa', cost: 50, emoji: '🛋️' },
  { type: 'bed', label: 'Ranjang', cost: 80, emoji: '🛏️' },
  { type: 'table', label: 'Meja Tamu', cost: 40, emoji: '🪑' },
  { type: 'plant', label: 'Tanaman', cost: 30, emoji: '🪴' },
  { type: 'tv', label: 'TV', cost: 60, emoji: '📺' },
  { type: 'desk', label: 'Meja Belajar', cost: 50, emoji: '📖' },
  { type: 'bookshelf', label: 'Rak Buku', cost: 45, emoji: '📚' },
  { type: 'toybox', label: 'Kotak Mainan', cost: 25, emoji: '🧸' },
  { type: 'lamp', label: 'Lampu', cost: 20, emoji: '💡' },
  { type: 'rug', label: 'Karpet', cost: 35, emoji: '🟫' },
];

export default function FurnitureStore() {
  const { member, isPremium, refresh } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [furniture, setFurniture] = useState([]);
  const [buying, setBuying] = useState(null);

  const load = async () => {
    if (!member) return;
    const f = await base44.entities.Furniture.filter({ family_id: member.family_id }, '-created_date', 100);
    setFurniture(f);
  };

  useEffect(() => { load(); }, [member]);

  if (!member) return null;

  const buy = async (item) => {
    setBuying(item.type);
    try {
      const { data } = await base44.functions.invoke('buyFurniture', {
        type: item.type, label: item.label, room: 'ruang_keluarga', cost: item.cost,
      });
      if (data?.error) throw new Error(data.error);
      toast({ title: `${item.label} dibeli!`, description: `-${item.cost} poin` });
      load(); refresh();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setBuying(null); }
  };

  return (
    <div className="px-5 pt-8 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Toko Furnitur</h1>
      </div>

      <Card className="p-3 mb-4 flex items-center gap-2">
        <Coins className="h-5 w-5 text-accent" />
        <span className="font-bold">{member.points_balance || 0} poin</span>
      </Card>

      {!isPremium && (
        <Card className="p-4 mb-4 border-amber-400/40 bg-amber-400/10">
          <div className="flex items-center gap-2 mb-1"><Crown className="h-4 w-4 text-amber-500" /><p className="font-bold text-sm text-amber-700 dark:text-amber-400">Fitur Premium</p></div>
          <p className="text-xs text-muted-foreground">Toko furnitur adalah fitur Premium. <button onClick={() => navigate('/premium')} className="text-primary font-bold underline">Lihat paket</button></p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {CATALOG.map((item) => (
          <Card key={item.type} className="p-3">
            <div className="text-3xl mb-1 text-center">{item.emoji}</div>
            <p className="font-bold text-sm text-center">{item.label}</p>
            <p className="text-xs text-center text-accent font-bold mb-2">{item.cost} poin</p>
            <Button size="sm" className="w-full rounded-full" disabled={!isPremium || buying === item.type || (member.points_balance || 0) < item.cost} onClick={() => buy(item)}>
              {buying === item.type ? '...' : <><ShoppingCart className="h-3 w-3 mr-1" /> Beli</>}
            </Button>
          </Card>
        ))}
      </div>

      {furniture.length > 0 && (
        <>
          <h2 className="font-bold mt-5 mb-2">Furnitur Anda</h2>
          <div className="flex flex-wrap gap-2">
            {furniture.map((f) => (
              <div key={f.id} className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5">
                <span>{CATALOG.find(c => c.type === f.type)?.emoji}</span>
                <span className="text-xs font-semibold">{f.label}</span>
                <span className="text-[10px] text-muted-foreground">· {ROOM_LABELS[f.room]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}