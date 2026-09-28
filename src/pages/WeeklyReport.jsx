import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import { ArrowLeft, Sparkles, Loader2, MessageCircle, CheckCircle, Award, TrendingUp, FileDown } from 'lucide-react';

export default function WeeklyReport() {
  const { member } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await base44.functions.invoke('generateWeeklyReport', {});
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    } finally { setLoading(false); }
  };

  if (!member) return null;

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Laporan Mingguan - Nutrisi Digital', 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 20, 30);
    doc.setTextColor(0);
    let y = 42;
    if (result.report) {
      doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Ringkasan', 20, y); y += 7;
      doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(result.report.headline, 170), 20, y); y += 15;
      if (result.report.highlights?.length) {
        doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Sorotan', 20, y); y += 7;
        doc.setFontSize(11); doc.setFont(undefined, 'normal');
        result.report.highlights.forEach((h) => { doc.text(doc.splitTextToSize('• ' + h, 170), 20, y); y += 10; });
        y += 3;
      }
      if (result.report.balance_notes) {
        doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Keseimbangan', 20, y); y += 7;
        doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(result.report.balance_notes, 170), 20, y); y += 15;
      }
      if (result.report.suggestion) {
        doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Saran', 20, y); y += 7;
        doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(result.report.suggestion, 170), 20, y); y += 15;
      }
    }
    if (result.stats?.perMember?.length) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('Per Anggota', 20, y); y += 8;
      doc.setFontSize(11); doc.setFont(undefined, 'normal');
      result.stats.perMember.forEach((m) => { doc.text(`${m.name}: ${m.msgs} pesan, ${m.tasksDone} tugas, ${m.pointsEarned} poin`, 20, y); y += 7; });
    }
    doc.save(`laporan-mingguan-${Date.now()}.pdf`);
  };

  return (
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-1 -ml-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-extrabold">Laporan Mingguan</h1>
      </div>

      <Card className="p-4 mb-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-center gap-2 mb-1"><Sparkles className="h-5 w-5 text-primary" /><p className="font-bold">Nutrisi Digital</p></div>
        <p className="text-xs text-muted-foreground">Laporan kesehatan digital keluarga 7 hari terakhir, dirangkum oleh AI.</p>
        <Button onClick={run} disabled={loading} className="w-full mt-3 rounded-full">{loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menganalisis...</> : <><Sparkles className="h-4 w-4 mr-1" /> Buat Laporan</>}</Button>
      </Card>

      {result && (
        <div className="space-y-3">
          <Button variant="outline" className="w-full rounded-full" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" /> Export PDF</Button>
          {result.stats && (
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={MessageCircle} label="Pesan" value={result.stats.totalMessages || 0} />
              <Stat icon={CheckCircle} label="Tugas Disetujui" value={result.stats.tasksApproved || 0} />
              <Stat icon={Award} label="Poin Diperoleh" value={result.stats.totalPointsEarned || 0} />
              <Stat icon={TrendingUp} label="Total Tugas" value={result.stats.totalTasks || 0} />
            </div>
          )}
          {result.report && (
            <Card><CardContent className="p-4 space-y-3">
              <div><p className="text-xs font-bold text-muted-foreground mb-1">Ringkasan</p><p className="text-sm font-semibold">{result.report.headline}</p></div>
              {result.report.highlights?.length > 0 && (
                <div><p className="text-xs font-bold text-muted-foreground mb-1">Sorotan</p><ul className="text-sm space-y-1">{result.report.highlights.map((h, i) => <li key={i}>• {h}</li>)}</ul></div>
              )}
              {result.report.balance_notes && <div><p className="text-xs font-bold text-muted-foreground mb-1">Keseimbangan</p><p className="text-sm">{result.report.balance_notes}</p></div>}
              {result.report.suggestion && <div className="rounded-xl bg-primary/5 p-3"><p className="text-xs font-bold text-primary mb-1">Saran</p><p className="text-sm">{result.report.suggestion}</p></div>}
            </CardContent></Card>
          )}
          {result.stats?.perMember?.length > 0 && (
            <Card><CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground mb-2">Per Anggota</p>
              <div className="space-y-2">
                {result.stats.perMember.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{m.name}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{m.msgs} pesan</span><span>{m.tasksDone} tugas</span><span className="text-accent font-bold">{m.pointsEarned} poin</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="p-3">
      <Icon className="h-4 w-4 text-primary mb-1" />
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}