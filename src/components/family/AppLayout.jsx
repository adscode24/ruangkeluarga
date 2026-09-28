import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { FamilyProvider, useFamily } from '@/lib/familyContext';
import { supabase } from '@/api/supabaseClient';
import { isChild } from '@/lib/familyConstants';
import { Home as HomeIcon, MessageCircle, Wallet, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedOutlet from '@/components/family/AnimatedOutlet';
import ScreenTimeLock from '@/components/family/ScreenTimeLock';

function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    { to: '/', icon: HomeIcon, label: 'Rumah' },
    { to: '/messages', icon: MessageCircle, label: 'Pesan' },
    { to: '/wallet', icon: Wallet, label: 'Poin' },
    { to: '/family', icon: Users, label: 'Keluarga' },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border z-50 pb-[env(safe-area-inset-bottom)] select-none">
      <div className="max-w-md mx-auto flex">
        {items.map((i) => {
          const active = i.to === '/' ? pathname === '/' : pathname.startsWith(i.to);
          return <Link key={i.to} to={i.to} className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors', active ? 'text-primary' : 'text-muted-foreground')}><i.icon className={cn('h-5 w-5', active && 'scale-110')} style={{ transition: 'transform 0.15s' }} />{i.label}</Link>;
        })}
      </div>
    </nav>
  );
}

function LockChecker() {
  const { member } = useFamily();
  const [limit, setLimit] = useState(null);

  useEffect(() => {
    if (!member || !isChild(member.family_role)) return;
    const load = () => supabase.from('screen_time_limits').select('*').eq('member_id', member.id).then(({ data }) => setLimit(data?.[0] || null));
    load();
    const ch = supabase.channel('limits-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'screen_time_limits' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [member]);

  if (!member || !isChild(member.family_role) || !limit) return null;
  const totalAllowed = (limit.daily_limit_minutes || 0) + (limit.bonus_minutes || 0);
  const used = limit.used_today_minutes || 0;
  const remaining = Math.max(0, totalAllowed - used);
  if (!limit.is_locked && remaining > 0) return null;
  return <ScreenTimeLock memberName={member.full_name} />;
}

function LayoutInner() {
  const { loading, user, member } = useFamily();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-accent/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!user?.family_id || !member) return <Navigate to="/onboarding" replace />;
  return <div className="min-h-screen bg-background pb-20"><div className="max-w-md mx-auto"><AnimatedOutlet /></div><BottomNav /><LockChecker /></div>;
}

export default function AppLayout() {
  return <FamilyProvider><LayoutInner /></FamilyProvider>;
}
