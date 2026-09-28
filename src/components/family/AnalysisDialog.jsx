import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';
import { Brain, Loader2, AlertTriangle, Heart, Lightbulb } from 'lucide-react';

export default function AnalysisDialog({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyzeFamilyCommunication', { body: {} });
      if (error) throw error;
      setResult(data.insights || data.analysis || data);
    } catch (e) {
      setResult({ summary: 'Gagal menjalankan analisis: ' + e.message, concerns: [], positive_notes: '', suggestion: '' });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Analisis Komunikasi AI</DialogTitle></DialogHeader>
        {!result && !loading && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-sm text-muted-foreground mb-4">Jalankan analisis AI untuk mendeteksi pola komunikasi. <span className="font-semibold">Privasi terjaga</span>.</p>
            <Button onClick={run} className="rounded-full"><Brain className="h-4 w-4 mr-1" /> Jalankan Analisis</Button>
          </div>
        )}
        {loading && <div className="flex flex-col items-center justify-center py-8 gap-2"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Menganalisis...</p></div>}
        {result && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><p className="text-xs font-bold text-muted-foreground mb-1">Ringkasan</p><p className="text-sm">{result.summary}</p></div>
            {result.concerns?.length > 0 && <div className="rounded-xl bg-destructive/10 p-3"><p className="text-xs font-bold text-destructive mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Kekhawatiran</p><ul className="text-sm space-y-1">{result.concerns.map((c, i) => <li key={i}>• {c}</li>)}</ul></div>}
            {result.positive_notes && <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3"><p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1"><Heart className="h-3 w-3" /> Hal Positif</p><p className="text-sm">{result.positive_notes}</p></div>}
            {result.suggestion && <div className="rounded-xl bg-primary/5 p-3"><p className="text-xs font-bold text-primary mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Saran</p><p className="text-sm">{result.suggestion}</p></div>}
            <Button variant="outline" className="w-full rounded-full" onClick={run}>Analisis Ulang</Button>
          </div>
        )}
        <DialogFooter><Button variant="ghost" onClick={() => { onOpenChange(false); setResult(null); }}>Tutup</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
