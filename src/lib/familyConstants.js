export const ROLE_LABELS = {
  ayah: "Ayah", ibu: "Ibu", kakak: "Kakak", adik: "Adik",
  kakek: "Kakek", nenek: "Nenek", om: "Om", tante: "Tante"
};

export const ROLE_EMOJI = {
  ayah: "👨", ibu: "👩", kakak: "🧑", adik: "🧒",
  kakek: "👴", nenek: "👵", om: "🧔", tante: "👩"
};

export const ROOM_LABELS = {
  ruang_keluarga: "Ruang Keluarga",
  kamar_orang_tua: "Kamar Orang Tua",
  kamar_kakak: "Kamar Kakak",
  kamar_adik: "Kamar Adik",
  luar_rumah: "Luar Rumah"
};

export const ROOM_EMOJI = {
  ruang_keluarga: "🛋️",
  kamar_orang_tua: "🛏️",
  kamar_kakak: "📚",
  kamar_adik: "🧸",
  luar_rumah: "🌳"
};

export const ROOM_COLORS = {
  ruang_keluarga: "bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800/60",
  kamar_orang_tua: "bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800/60",
  kamar_kakak: "bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800/60",
  kamar_adik: "bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800/60",
  luar_rumah: "bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/60"
};

export const ROLE_COLORS = {
  ayah: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  ibu: "bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300",
  kakak: "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300",
  adik: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  kakek: "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300",
  nenek: "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300",
  om: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  tante: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
};

export const isParent = (r) => r === "ayah" || r === "ibu";
export const PERMISSIONS = {
  ayah: ["full_access"], ibu: ["full_access"],
  kakak: ["self_manage", "chat_allowed_rooms", "redeem_points"],
  adik: ["view_only", "receive_messages", "limited_redeem"],
  kakek: ["view_grandchildren", "bonus_points_limited"],
  nenek: ["view_grandchildren", "bonus_points_limited"],
  om: ["view_only", "chat"], tante: ["view_only", "chat"]
};

export const hasPermission = (r, p) => {
  const perms = PERMISSIONS[r] || [];
  return perms.includes("full_access") || perms.includes(p);
};

export const canApprovePoints = (r) => isParent(r);
export const canRedeemPoints = (r) => hasPermission(r, "redeem_points") || hasPermission(r, "limited_redeem");
export const canGiveBonus = (r) => hasPermission(r, "full_access") || hasPermission(r, "bonus_points_limited");
export const isLimitedRedeem = (r) => r === "adik";
export const canChangeOwnLocation = (r) => r !== "adik";
export const canAccessRoom = (r, allowed) => !allowed || !allowed.length ? true : allowed.includes(r);
export const isChild = (r) => r === "kakak" || r === "adik";

export const OUTSIDE_OPTIONS = ["Sekolah", "Kantor", "Les / Kursus", "Rumah Teman", "Lainnya"];

export const ROLE_OPTIONS = [
  { value: "ayah", label: "Ayah" },
  { value: "ibu", label: "Ibu" },
  { value: "kakak", label: "Kakak" },
  { value: "adik", label: "Adik" },
  { value: "kakek", label: "Kakek" },
  { value: "nenek", label: "Nenek" },
  { value: "om", label: "Om" },
  { value: "tante", label: "Tante" },
];