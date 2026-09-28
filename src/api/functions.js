import { supabase, isSupabaseConfigured } from './supabaseClient';

// Semua 35 fungsi Base44 dipetakan ke endpoint Vercel: /api/functions/<nama>
// Saat Supabase belum dikonfigurasi (demo/build), kembalikan stub agar UI tidak crash.
const ALL_FUNCTIONS = [
  'acceptInvitation', 'adminDeleteFamily', 'adminUpdateFamily', 'analyzeFamilyCommunication',
  'applyAllFamilyModes', 'applyFamilyMode', 'approvePointTransaction', 'awardPoints',
  'buyFurniture', 'checkInvitation', 'checkSubscription', 'completeTask', 'confirmReceiveCash',
  'createCheckoutSession', 'createFamily', 'deleteFamilyData', 'deleteMyAccount',
  'endScreenTimeSession', 'generateWeeklyReport', 'getAdminStats', 'getMyFamily',
  'inviteMember', 'joinFamily', 'notifyNewMessage', 'notifyTaskAssigned', 'reportDeviceData',
  'requestRedemption', 'setFamilySubscription', 'startScreenTimeSession', 'updateMemberLocation',
  'updateMemberRole', 'updateProfile', 'updateScreenTimeLimit', 'updateVirtualHome',
];

async function demoInvoke(name, payload) {
  // Stub cerdas untuk demo: operasi keluarga inti jalan lokal via demoStore sudah di-handle
  // oleh entities. Di sini cukup kembalikan sukses agar toast/flow tidak error.
  const ok = { success: true, demo: true, function: name };
  if (name === 'checkSubscription') return { data: { plan: 'free', status: 'active', isPremium: false } };
  if (name === 'getAdminStats') return { data: { totals: { families: 0, members: 0, premium: 0, free: 0 }, families: [], allUsers: [] } };
  if (name === 'generateWeeklyReport') {
    return { data: { stats: { totalMessages: 0, totalTasks: 0, tasksApproved: 0, totalPointsEarned: 0, perMember: [] }, report: { headline: 'Mode demo — hubungkan Supabase untuk laporan AI', highlights: [], balance_notes: '-', suggestion: 'Isi VITE_SUPABASE_URL untuk data nyata.' } } };
  }
  if (name === 'checkInvitation') return { data: { invitations: [] } };
  return { data: ok };
}

export async function invokeFunction(name, payload = {}) {
  if (!ALL_FUNCTIONS.includes(name)) throw new Error(`Fungsi tidak dikenal: ${name}`);
  if (!isSupabaseConfigured || !supabase) return demoInvoke(name, payload);

  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`/api/functions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `Fungsi ${name} gagal`), { status: res.status, data: json });
  return { data: json };
}
