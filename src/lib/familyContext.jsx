import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

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
    const myMembers = await base44.entities.FamilyMember.filter({ user_id: u.id });
    if (myMembers.length) setMember(myMembers[0]);
    const fams = await base44.entities.Family.filter({ id: fid });
    if (fams.length) setFamily(fams[0]);
    const mems = await base44.entities.FamilyMember.filter({ family_id: fid });
    setMembers(mems);
    const rms = await base44.entities.FamilyRoom.filter({ family_id: fid });
    setRooms(rms);
    try {
      const { data } = await base44.functions.invoke('checkSubscription', {});
      if (data && !data.error) { setSubscription(data); setIsPremium(Boolean(data.isPremium)); }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (u && u.id) {
          try { await base44.auth.updateMe({ last_active: new Date().toISOString() }); } catch (e) { /* ignore */ }
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
    if (!user?.family_id) return;
    const unsubMembers = base44.entities.FamilyMember.subscribe(() => loadAll(user));
    const unsubRooms = base44.entities.FamilyRoom.subscribe(() => loadAll(user));
    return () => { unsubMembers(); unsubRooms(); };
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