import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Check } from 'lucide-react';

const COLORS = [
  { name: 'Teal', hex: '#5eead4' },
  { name: 'Biru', hex: '#3b82f6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Ungu', hex: '#8b5cf6' },
  { name: 'Oranye', hex: '#f59e0b' },
  { name: 'Hijau', hex: '#10b981' },
  { name: 'Merah', hex: '#ef4444' },
  { name: 'Abu', hex: '#6b7280' },
];

const HATS = [
  { value: 'none', label: 'Tidak Ada', emoji: '🙂' },
  { value: 'cap', label: 'Topi', emoji: '🧢' },
  { value: 'crown', label: 'Mahkota', emoji: '👑' },
  { value: 'hijab', label: 'Hijab', emoji: '🧕' },
];

export default function AvatarCustomize() {
  const { member, isPremium, refresh } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [color, setColor] = useState(member?.avatar_config?.body_color || '#5eead4');
  const [hat, setHat] = useState(member?.avatar_config?.hat || 'none');
  const [saving, setSaving] = useState(false);

  if (!member) return null;

  const generateAvatarImage = () => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(128, 128, 128, 0, Math.PI * 2);
      ctx.fill();
      const hatEmoji = HATS.find(h => h.value === hat)?.emoji || '🙂';
      ctx.font = '120px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hatEmoji, 128, 128);
      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], 'avatar.png', { type: 'image/png' });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          resolve(file_url);
        } catch (e) { reject(e); }
      }, 'image/png');
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const avatarUrl = await generateAvatarImage();
      await base44.entities.FamilyMember.update(member.id, {
        avatar_config: { body_color: color, hat },
        avatar_url: avatarUrl,
      });
      toast({ title: 'Avatar disimpan sebagai foto!' });
      refresh();
      navigate('/settings');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="px-5 pt-8 pb-20">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Avatar</h1>
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="h-32 w-32 rounded-full flex items-center justify-center shadow-lg" style={{ background: color }}>
          <span className="text-5xl">{HATS.find(h => h.value === hat)?.emoji || '🙂'}</span>
        </div>
        <p className="mt-3 font-bold">{member.full_name}</p>
      </div>

      <div className="mb-5">
        <p className="text-sm font-bold mb-2">Warna</p>
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((c) => (
            <button key={c.hex} onClick={() => setColor(c.hex)} className={`h-12 rounded-xl border-2 transition-all ${color === c.hex ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`} style={{ background: c.hex }}>
              {color === c.hex && <Check className="h-5 w-5 text-white mx-auto drop-shadow" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <p className="text-sm font-bold mb-2">Aksesori Kepala</p>
        <div className="grid grid-cols-4 gap-2">
          {HATS.map((h) => (
            <button key={h.value} onClick={() => setHat(h.value)} className={`p-3 rounded-xl border-2 transition-all ${hat === h.value ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <span className="text-2xl block">{h.emoji}</span>
              <span className="text-[10px] font-semibold">{h.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full rounded-full">
        {saving ? 'Menyimpan...' : 'Simpan Avatar'}
      </Button>
    </div>
  );
}