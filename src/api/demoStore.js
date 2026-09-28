// Demo store — dipakai saat VITE_SUPABASE_URL belum diisi.
// Tujuannya: `npm run build` + deploy Vercel tetap ZERO ERROR dan UI bisa dibuka.
// Data tersimpan di localStorage, tanpa backend.

const KEY = 'rk_demo_db_v1';

const ENTITIES = [
  'Family', 'FamilyMember', 'FamilyRoom', 'FamilyTask', 'FamilyContract',
  'FamilySchedule', 'FamilyInvitation', 'PointTransaction', 'ScreenTimeLimit',
  'ScreenTimeSession', 'RoomMessage', 'DirectMessage', 'Notification',
  'Furniture', 'Subscription', 'DeviceReport',
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const db = {};
  for (const e of ENTITIES) db[e] = [];
  return db;
}

function save(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ }
}

let db = typeof window !== 'undefined' ? load() : {};
const listeners = new Set();
function notify() { save(db); listeners.forEach((cb) => { try { cb(); } catch { /* ignore */ } }); }

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();

function matches(item, filter = {}) {
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or') {
      if (!v.some((cond) => matches(item, cond))) return false;
      continue;
    }
    const val = item[k] ?? item.data?.[k];
    if (val !== v) return false;
  }
  return true;
}

function sortItems(items, sort) {
  if (!sort) return items;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...items].sort((a, b) => {
    const av = a[field] ?? a.created_date ?? '';
    const bv = b[field] ?? b.created_date ?? '';
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

export function demoEntity(name) {
  return {
    async filter(filter = {}, sort, limit = 200) {
      const items = (db[name] || []).filter((i) => matches(i, filter));
      const sorted = sortItems(items, sort);
      return limit ? sorted.slice(0, limit) : sorted;
    },
    async list(sort, limit = 200) {
      return this.filter({}, sort, limit);
    },
    async get(id) {
      return (db[name] || []).find((i) => i.id === id) || null;
    },
    async create(data) {
      const item = { id: uid(), created_date: now(), updated_date: now(), ...data };
      db[name] = [...(db[name] || []), item];
      notify();
      return item;
    },
    async update(id, data) {
      db[name] = (db[name] || []).map((i) => (i.id === id ? { ...i, ...data, updated_date: now() } : i));
      notify();
      return (db[name] || []).find((i) => i.id === id) || null;
    },
    async delete(id) {
      db[name] = (db[name] || []).filter((i) => i.id !== id);
      notify();
      return { success: true };
    },
    async deleteMany(filter = {}) {
      const before = (db[name] || []).length;
      db[name] = (db[name] || []).filter((i) => !matches(i, filter));
      notify();
      return { deleted: before - db[name].length };
    },
    async bulkCreate(rows = []) {
      const items = rows.map((r) => ({ id: uid(), created_date: now(), updated_date: now(), ...r }));
      db[name] = [...(db[name] || []), ...items];
      notify();
      return items;
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

export function resetDemoDb() {
  db = {};
  for (const e of ENTITIES) db[e] = [];
  notify();
}
