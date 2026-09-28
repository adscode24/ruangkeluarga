import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import MemberAvatar from '@/components/family/MemberAvatar';
import { Battery, BatteryCharging, MapPin, Smartphone, Clock, ExternalLink } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/familyConstants';

export default function DeviceDetailDialog({ member, open, onOpenChange }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member || !open) return;
    setLoading(true);
    base44.entities.DeviceReport.filter({ member_id: member.id })
      .then((reports) => setReport(reports[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [member, open]);

  const lastReported = report?.updated_date ? new Date(report.updated_date) : null;
  const mapsUrl = report?.location_lat && report?.location_lng
    ? `https://maps.google.com/?q=${report.location_lat},${report.location_lng}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MemberAvatar member={member} size="sm" />
            <span>{member?.full_name}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : !report ? (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada data perangkat. Data akan muncul saat anak aktif menggunakan aplikasi.</p>
        ) : (
          <div className="space-y-3">
            {/* Battery */}
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {report.is_charging ? <BatteryCharging className="h-5 w-5 text-emerald-500" /> : <Battery className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm font-bold">Baterai</span>
                </div>
                <span className={`text-lg font-extrabold ${(report.battery_level ?? 0) <= 20 ? 'text-destructive' : 'text-primary'}`}>
                  {report.battery_level ?? '?'}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                <div className={`h-full ${(report.battery_level ?? 0) <= 20 ? 'bg-destructive' : (report.battery_level ?? 0) <= 50 ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${report.battery_level ?? 0}%` }} />
              </div>
              {report.is_charging && <p className="text-xs text-emerald-500 font-bold mt-1">⚡ Sedang mengisi daya</p>}
            </Card>

            {/* Location */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold">Lokasi Real-time</span>
              </div>
              {report.location_lat && report.location_lng ? (
                <>
                  <p className="text-sm font-semibold mb-1">{report.location_name || 'Lokasi terdeteksi'}</p>
                  <p className="text-xs text-muted-foreground mb-2">{report.location_lat.toFixed(5)}, {report.location_lng.toFixed(5)}</p>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1.5 w-fit">
                      <ExternalLink className="h-3.5 w-3.5" /> Buka di Maps
                    </a>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Lokasi belum tersedia</p>
              )}
            </Card>

            {/* App Usage */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-5 w-5 text-violet-500" />
                <span className="text-sm font-bold">Aplikasi 24 Jam Terakhir</span>
              </div>
              {report.app_usage?.length ? (
                <div className="space-y-1.5">
                  {report.app_usage.map((a, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{a.app_name}</span>
                      <span className="text-xs text-muted-foreground">{a.duration_minutes} m</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada data pemakaian aplikasi</p>
              )}
            </Card>

            {lastReported && (
              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Terakhir diperbarui: {lastReported.toLocaleString('id-ID')}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}