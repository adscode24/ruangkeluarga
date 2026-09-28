import { supabase, isSupabaseConfigured } from './supabaseClient';
import { demoEntity } from './demoStore';

// Mapping entity Base44 -> tabel Supabase (snake_case, lihat supabase/schema.sql)
export const ENTITY_TABLE = {
  Family: 'families',
  FamilyMember: 'family_members',
  FamilyRoom: 'family_rooms',
  FamilyTask: 'family_tasks',
  FamilyContract: 'family_contracts',
  FamilySchedule: 'family_schedules',
  FamilyInvitation: 'family_invitations',
  PointTransaction: 'point_transactions',
  ScreenTimeLimit: 'screen_time_limits',
  ScreenTimeSession: 'screen_time_sessions',
  RoomMessage: 'room_messages',
  DirectMessage: 'direct_messages',
  Notification: 'notifications',
  Furniture: 'furniture',
  Subscription: 'subscriptions',
  DeviceReport: 'device_reports',
};

function applyFilter(query, filter = {}) {
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or' || k === 'id') continue; // $or ditangani client-side pasca-fetch sederhana
    if (k === 'id') query = query.eq('id', v);
    else query = query.eq(k, v);
  }
  return query;
}

function postFilter(items, filter = {}) {
  if (!filter.$or) {
    if (filter.id) return items.filter((i) => i.id === filter.id);
    return items;
  }
  return items.filter((item) =>
    filter.$or.some((cond) => Object.entries(cond).every(([k, v]) => {
      if (k.startsWith('data.')) return item[k.slice(5)] === v;
      return item[k] === v;
    }))
  );
}

function supaEntity(entityName) {
  const table = ENTITY_TABLE[entityName];
  return {
    async filter(filter = {}, sort, limit = 200) {
      let q = supabase.from(table).select('*');
      // filter sederhana (eq). $or/id difilter pasca-fetch.
      const simple = {};
      for (const [k, v] of Object.entries(filter)) {
        if (k !== '$or' && typeof v !== 'object') simple[k] = v;
      }
      q = applyFilter(q, simple);
      if (sort) {
        const desc = sort.startsWith('-');
        const col = desc ? sort.slice(1) : sort;
        const safeCol = col === 'created_date' ? 'created_at' : col;
        q = q.order(safeCol, { ascending: !desc });
      } else {
        q = q.order('created_at', { ascending: false });
      }
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const mapped = (data || []).map(mapRow);
      return postFilter(mapped, filter);
    },
    async list(sort, limit = 200) {
      return this.filter({}, sort, limit);
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) return null;
      return mapRow(data);
    },
    async create(payload) {
      const { data, error } = await supabase.from(table).insert(unmapRow(payload)).select().single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(unmapRow(payload)).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true };
    },
    async deleteMany(filter = {}) {
      let q = supabase.from(table).delete();
      q = applyFilter(q, filter);
      const { error } = await q;
      if (error) throw new Error(error.message);
      return { success: true };
    },
    async bulkCreate(rows = []) {
      const { data, error } = await supabase.from(table).insert(rows.map(unmapRow)).select();
      if (error) throw new Error(error.message);
      return (data || []).map(mapRow);
    },
    subscribe(cb) {
      const ch = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => { try { cb(); } catch { /* ignore */ } })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    },
  };
}

// created_date (Base44) <-> created_at (Supabase). Pertahankan keduanya agar UI lama tetap jalan.
function mapRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  if (row.created_at && !row.created_date) out.created_date = row.created_at;
  if (row.updated_at && !row.updated_date) out.updated_date = row.updated_at;
  return out;
}

function unmapRow(payload) {
  const out = { ...payload };
  delete out.created_date;
  delete out.updated_date;
  return out;
}

export function getEntity(entityName) {
  if (isSupabaseConfigured && supabase) return supaEntity(entityName);
  return demoEntity(entityName);
}
