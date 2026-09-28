import { useNavigate } from 'react-router-dom';
import { Lock, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ScreenTimeLock({ memberName }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center px-6 text-white">
      <div className="h-24 w-24 rounded-full bg-destructive/20 flex items-center justify-center mb-6 animate-pulse">
        <Lock className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-extrabold mb-2">Waktu Layar Habis</h1>
      <p className="text-sm text-slate-300 text-center mb-1">Layar terkunci untuk hari ini.</p>
      <p className="text-sm text-slate-300 text-center mb-6">{memberName ? `${memberName}, ` : ''}tanyakan orang tua untuk waktu tambahan, atau tukar poin untuk bonus menit.</p>
      <Button onClick={() => navigate('/wallet')} className="rounded-full mb-2">
        <Coins className="h-4 w-4 mr-1" /> Tukar Poin untuk Bonus Waktu
      </Button>
      <p className="text-xs text-slate-400 mt-4">🔒 Aplikasi terkunci. Hanya orang tua yang dapat membuka kembali.</p>
    </div>
  );
}