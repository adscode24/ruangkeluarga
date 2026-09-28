import { adminClient } from './supabase.js';

export function getBearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h) return null;
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// Verifikasi token Supabase & ambil profile app (id, email, role, family_id)
export async function requireUser(req) {
  const token = getBearer(req);
  if (!token) {
    const e = new Error('Tidak terautentikasi');
    e.status = 401;
    throw e;
  }
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    const e = new Error('Sesi tidak valid');
    e.status = 401;
    throw e;
  }
  const u = data.user;
  const { data: profile } = await admin.from('profiles').select('*').eq('id', u.id).single();
  return {
    id: u.id,
    email: u.email,
    full_name: profile?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Anggota',
    role: profile?.role || 'user',
    family_id: profile?.family_id || null,
  };
}

export async function requireMember(req) {
  const user = await requireUser(req);
  const admin = adminClient();
  const { data: members } = await admin.from('family_members').select('*').eq('user_id', user.id);
  const member = (members || [])[0];
  if (!member) {
    const e = new Error('Profil anggota tidak ditemukan');
    e.status = 404;
    throw e;
  }
  return { user, member, admin };
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function ok(res, body = {}) {
  return send(res, 200, body);
}

export function fail(res, err) {
  const status = err?.status || 500;
  return send(res, status, { error: err?.message || 'Terjadi kesalahan' });
}

export function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

export function withCors(handler) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
    try {
      await handler(req, res);
    } catch (e) {
      fail(res, e);
    }
  };
}
