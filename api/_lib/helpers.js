// Port langsung dari base44/shared/familyHelpers.ts
export const DEFAULT_ROOMS = [
  { room_name: 'ruang_keluarga', room_description: 'Ruang utama untuk semua anggota keluarga', allowed_roles: ['ayah', 'ibu', 'kakak', 'adik', 'kakek', 'nenek', 'om', 'tante'] },
  { room_name: 'kamar_orang_tua', room_description: 'Diskusi privat orang tua', allowed_roles: ['ayah', 'ibu', 'kakek', 'nenek'] },
  { room_name: 'kamar_kakak', room_description: 'Ruang kakak — diskusi tugas & curhat', allowed_roles: ['ayah', 'ibu', 'kakak'] },
  { room_name: 'kamar_adik', room_description: 'Ruang adik — pengingat belajar & cerita', allowed_roles: ['ayah', 'ibu', 'adik'] },
];

export const ROLE_LABELS = { ayah: 'Ayah', ibu: 'Ibu', kakak: 'Kakak', adik: 'Adik', kakek: 'Kakek', nenek: 'Nenek', om: 'Om', tante: 'Tante' };
export const VALID_ROLES = Object.keys(ROLE_LABELS);
export const VALID_LOCATIONS = ['ruang_keluarga', 'kamar_orang_tua', 'kamar_kakak', 'kamar_adik', 'luar_rumah'];

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const PERMISSIONS = {
  ayah: ['full_access'], ibu: ['full_access'],
  kakak: ['self_manage', 'chat_allowed_rooms', 'redeem_points'],
  adik: ['view_only', 'receive_messages', 'limited_redeem'],
  kakek: ['view_grandchildren', 'bonus_points_limited'],
  nenek: ['view_grandchildren', 'bonus_points_limited'],
  om: ['view_only', 'chat'], tante: ['view_only', 'chat'],
};

export function hasPermission(role, permission) {
  const perms = PERMISSIONS[role] || [];
  return perms.includes('full_access') || perms.includes(permission);
}
export const isParent = (role) => role === 'ayah' || role === 'ibu';
export const isChild = (role) => role === 'kakak' || role === 'adik';
export const canApprovePoints = (role) => isParent(role);
export const canRedeemPoints = (role) => hasPermission(role, 'redeem_points') || hasPermission(role, 'limited_redeem');
export const canGiveBonus = (role) => hasPermission(role, 'full_access') || hasPermission(role, 'bonus_points_limited');
export const canChangeOwnLocation = (role) => role !== 'adik';
export const canManageFamily = (role) => isParent(role);
export function canAccessRoom(role, allowedRoles) {
  if (!allowedRoles || !allowedRoles.length) return true;
  return allowedRoles.includes(role);
}

export async function notifyMember(admin, family_id, userId, title, body, type, related_id) {
  if (!userId) return;
  try {
    await admin.from('notifications').insert({
      family_id, user_id: userId, title, body, type, related_id: related_id || '', is_read: false,
    });
  } catch { /* ignore */ }
}

export async function notifyParents(admin, family_id, title, body, type, related_id) {
  const { data: members } = await admin.from('family_members').select('*').eq('family_id', family_id).eq('is_active', true);
  const parents = (members || []).filter((m) => m.family_role === 'ayah' || m.family_role === 'ibu');
  for (const p of parents) await notifyMember(admin, family_id, p.user_id, title, body, type, related_id);
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
