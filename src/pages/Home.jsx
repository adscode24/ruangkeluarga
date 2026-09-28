import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import MemberAvatar from '@/components/family/MemberAvatar';
import LocationPicker from '@/components/family/LocationPicker';
import VirtualHouse3D from '@/components/family/VirtualHouse3D';
import ThemeToggle from '@/components/family/ThemeToggle';
import PullToRefresh from '@/components/family/PullToRefresh';
import ScreenTimeWidget from '@/components/family/ScreenTimeWidget';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ROOM_LABELS, ROOM_EMOJI, ROOM_COLORS, isParent, isChild, canAccessRoom } from '@/lib/familyConstants';
import { Move, ChevronRight, Bell, Coins, Box, Settings as SettingsIcon, Crown, Users } from 'lucide-react';
import MembersPopup from '@/components/family/MembersPopup';

export default function Home() {
  const { user, member, family, members, rooms, refresh, isPremium } = useFamily();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [view3D, setView3D] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    if (member && isParent(member.family_role)) {
      base44.entities.PointTransaction.filter({ family_id: member.family_id, status: 'pending' })
        .then((txns) => setPendingCount(txns.length))
        .catch(() => {});
    }
  }, [member]);

  if (!member) return null;

  const membersInRoom = (name) => members.filter((m) => m.current_location === name && m.is_active);
  const outsideMembers = members.filter((m) => m.current_location === 'luar_rumah' && m.is_active);
  const roomByName = (n) => rooms.find((r) => r.room_name === n);
  const canEnter = (n) => canAccessRoom(member.family_role, roomByName(n)?.allowed_roles);

  const goRoom = (n) => {
    const r = roomByName(n);
    if (r && canEnter(n)) navigate(`/room/${r.id}`);
  };

  return (
    <PullToRefresh onRefresh={refresh}>
    <div className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Selamat datang,</p>
          <h1 className="text-2xl font-extrabold leading-tight">{member.full_name}</h1>
          <p className="text-sm text-primary font-semibold">{family?.family_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user?.role === 'admin' && <button onClick={() => navigate('/admin')} className="p-2 rounded-full hover:bg-muted"><Crown className="h-5 w-5 text-amber-500" /></button>}
          <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-muted"><SettingsIcon className="h-5 w-5" /></button>
          <button onClick={() => navigate('/family')}><MemberAvatar member={member} size="lg" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {isChild(member.family_role) ? (
          <Card className="p-4 bg-gradient-to-br from-accent/25 to-accent/5 border-accent/30">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold mb-1"><Coins className="h-4 w-4" /> Saldo Poin</div>
            <div className="text-3xl font-extrabold">{member.points_balance || 0}</div>
          </Card>
        ) : (
          <Card className="p-4 cursor-pointer active:scale-95 transition-transform" onClick={() => setMembersOpen(true)}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1"><Users className="h-4 w-4" /> Anggota</div>
            <div className="text-3xl font-extrabold">{members.length}</div>
          </Card>
        )}
        <Card className="p-4 cursor-pointer active:scale-95 transition-transform" onClick={() => navigate('/wallet')}>
          {isParent(member.family_role) ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1"><Bell className="h-4 w-4" /> Approval</div>
              <div className="text-3xl font-extrabold text-accent">{pendingCount}</div>
            </>
          ) : (
            <>
              <div className="text-xs font-bold text-muted-foreground mb-1">Dompet</div>
              <div className="text-2xl font-extrabold pt-1.5">Lihat →</div>
            </>
          )}
        </Card>
      </div>

      <ScreenTimeWidget />

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Rumah Virtual</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full relative" onClick={() => isPremium ? setView3D(true) : setShowPremium(true)}>
            <Box className="h-4 w-4 mr-1" /> 3D
            {!isPremium && <Crown className="h-3 w-3 absolute -top-1 -right-1 text-amber-500 fill-amber-400" />}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPickerOpen(true)}>
            <Move className="h-4 w-4 mr-1" /> Pindah
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <RoomCard room={roomByName('kamar_orang_tua')} members={membersInRoom('kamar_orang_tua')} locked={!canEnter('kamar_orang_tua')} onClick={() => goRoom('kamar_orang_tua')} />
        <div className="grid grid-cols-2 gap-2">
          <RoomCard room={roomByName('kamar_kakak')} members={membersInRoom('kamar_kakak')} locked={!canEnter('kamar_kakak')} onClick={() => goRoom('kamar_kakak')} />
          <RoomCard room={roomByName('kamar_adik')} members={membersInRoom('kamar_adik')} locked={!canEnter('kamar_adik')} onClick={() => goRoom('kamar_adik')} />
        </div>
        <RoomCard room={roomByName('ruang_keluarga')} members={membersInRoom('ruang_keluarga')} locked={false} onClick={() => goRoom('ruang_keluarga')} highlight />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <button onClick={() => navigate('/tasks')} className="rounded-2xl border-2 border-border bg-card p-4 text-left hover:shadow-md active:scale-[0.98] transition-all select-none">
          <div className="text-2xl mb-1">📋</div>
          <p className="font-bold text-sm">Tugas & Tantangan</p>
          <p className="text-xs text-muted-foreground">Selesaikan, dapat poin</p>
        </button>
        <button onClick={() => navigate('/contracts')} className="rounded-2xl border-2 border-border bg-card p-4 text-left hover:shadow-md active:scale-[0.98] transition-all select-none">
          <div className="text-2xl mb-1">📜</div>
          <p className="font-bold text-sm">Kontrak Keluarga</p>
          <p className="text-xs text-muted-foreground">Aturan bersama</p>
        </button>
        <button onClick={() => navigate('/modes')} className="rounded-2xl border-2 border-border bg-card p-4 text-left hover:shadow-md active:scale-[0.98] transition-all select-none">
          <div className="text-2xl mb-1">⏰</div>
          <p className="font-bold text-sm">Mode Otomatis</p>
          <p className="text-xs text-muted-foreground">Sekolah & Ramadan</p>
        </button>
        <button onClick={() => navigate('/report')} className="rounded-2xl border-2 border-border bg-card p-4 text-left hover:shadow-md active:scale-[0.98] transition-all select-none">
          <div className="text-2xl mb-1">📊</div>
          <p className="font-bold text-sm">Laporan Mingguan</p>
          <p className="text-xs text-muted-foreground">Nutrisi digital</p>
        </button>
        <button onClick={() => navigate('/avatar')} className="rounded-2xl border-2 border-border bg-card p-4 text-left hover:shadow-md active:scale-[0.98] transition-all select-none">
          <div className="text-2xl mb-1">🧑</div>
          <p className="font-bold text-sm">Avatar</p>
          <p className="text-xs text-muted-foreground">Kustomisasi 3D</p>
        </button>
        <button onClick={() => navigate('/furniture')} className="rounded-2xl border-2 border-border bg-card p-4 text-left hover:shadow-md active:scale-[0.98] transition-all select-none">
          <div className="text-2xl mb-1">🛋️</div>
          <p className="font-bold text-sm">Toko Furnitur</p>
          <p className="text-xs text-muted-foreground">Beli dengan poin</p>
        </button>
      </div>

      {!isPremium && (
        <button onClick={() => navigate('/premium')} className="w-full mt-3 rounded-2xl bg-gradient-to-r from-amber-400/20 to-primary/10 border border-amber-400/30 p-4 text-left active:scale-[0.98] transition-all select-none">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0"><Crown className="h-5 w-5 text-amber-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Upgrade ke Premium</p>
              <p className="text-xs text-muted-foreground">Mode 3D, avatar kustom, furnitur rumah</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </button>
      )}

      {outsideMembers.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-muted-foreground mb-2">🌳 Sedang di Luar Rumah</h3>
          <div className="flex flex-wrap gap-2">
            {outsideMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3 py-1.5">
                <MemberAvatar member={m} size="sm" />
                <div>
                  <p className="text-xs font-bold leading-tight">{m.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.outside_location_name || 'Luar'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view3D && <VirtualHouse3D onClose={() => setView3D(false)} />}
      {showPremium && <PremiumPrompt onClose={() => setShowPremium(false)} onTry={() => { setShowPremium(false); setView3D(true); }} onUpgrade={() => navigate('/premium')} />}
      <LocationPicker member={member} open={pickerOpen} onOpenChange={setPickerOpen} onDone={refresh} />
      <MembersPopup open={membersOpen} onOpenChange={setMembersOpen} members={members} />
    </div>
    </PullToRefresh>
  );
}

function RoomCard({ room, members, onClick, locked, highlight }) {
  if (!room) return null;
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`relative w-full rounded-3xl border-2 p-4 text-left transition-all select-none ${ROOM_COLORS[room.room_name]} ${locked ? 'opacity-50' : 'hover:shadow-md active:scale-[0.98]'} ${highlight ? 'min-h-[96px]' : ''}`}
    >
      {locked && <span className="absolute top-3 right-3 text-lg">🔒</span>}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ROOM_EMOJI[room.room_name]}</span>
          <span className="font-bold text-sm">{ROOM_LABELS[room.room_name]}</span>
        </div>
        {!locked && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex -space-x-2">
        {members.slice(0, 5).map((m) => <MemberAvatar key={m.id} member={m} size="sm" className="ring-2 ring-white" />)}
        {members.length === 0 && <span className="text-xs text-muted-foreground italic">Ruangan kosong</span>}
      </div>
    </button>
  );
}

function PremiumPrompt({ onClose, onTry, onUpgrade }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto mb-3"><Crown className="h-8 w-8 text-amber-500" /></div>
          <h2 className="text-xl font-extrabold mb-1">Mode 3D Premium</h2>
          <p className="text-sm text-muted-foreground mb-4">Jelajahi rumah virtual dalam mode 3D free-roam dengan joystick, avatar, dan furnitur. Buka dengan berlangganan Premium.</p>
          <Button onClick={onUpgrade} className="w-full rounded-full mb-2"><Crown className="h-4 w-4 mr-1" /> Lihat Paket Premium</Button>
          <Button variant="ghost" onClick={onTry} className="w-full text-muted-foreground text-sm">Tetap coba dulu</Button>
        </div>
      </div>
    </div>
  );
}