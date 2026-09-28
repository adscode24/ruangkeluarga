import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { auth } from '@/api/auth';

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async (u) => {
    if (!u?.family_id) return;
    const fid = u.family_id;
    const [{ data: myMembers }, { data: fams }, { data: mems }, { data: rms }, { data: sub }] = await Promise.all([
      supabase.from('family_members').select('*').eq('user_id', u.id),
      supabase.from('families').select('*').eq('id', fid),
      supabase.from('family_members').select('*').eq('family_id', fid),
      supabase.from('family_rooms').select('*').eq('family_id', fid),
      supabase.from('subscriptions').select('*').eq('family_id', fid),
    ]);
    if (myMembers?.length) setMember(myMembers[0]);
    if (fams?.length) setFamily(fams[0]);
    setMembers(mems || []);
    setRooms(rms || []);
    if (sub?.length) {
      setSubscription(sub[0]);
      setIsPremium(sub[0].plan !== 'free' && sub[0].status === 'active');
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const u = await auth.me();
        setUser(u);
        if (u && u.id) {
          try { await auth.updateMe({ last_active: new Date().toISOString() }); } catch { /* ignore */ }
        }
        await loadAll(u);
      } catch (e) {
        console.error('Family init error', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadAll]);

  useEffect(() => {
    if (!user?.family_id) return undefined;
    const ch1 = supabase.channel('members-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, () => loadAll(user)).subscribe();
    const ch2 = supabase.channel('rooms-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'family_rooms' }, () => loadAll(user)).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user, loadAll]);

  const refresh = useCallback(async () => {
    if (user) await loadAll(user);
  }, [user, loadAll]);

  const value = { user, member, family, members, rooms, loading, refresh, setMember, subscription, isPremium };
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  return useContext(FamilyContext);
}
