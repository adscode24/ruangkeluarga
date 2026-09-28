# BUSINESS_FLOW

## 1. Onboarding
`createFamily` (Family+Member founder+4 room default+profiles.family_id) →
`joinFamily` (kode 6-char) / `inviteMember` → `checkInvitation` → `acceptInvitation`.

## 2. Tugas → Poin → Redeem (kurs: 1 poin = 5 mnt / Rp100)
Buat tugas → anak `completeTask{complete}` → ortu `completeTask{approve}`
(+saldo, streak, txn `earned`) / `{reject}` →
anak `requestRedemption` (hold saldo, txn negatif `pending`) →
ortu `approvePointTransaction{approve}` (screen_time → +bonus_minutes+unlock;
cash → menunggu konfirmasi) / `{reject}` (refund) →
anak `confirmReceiveCash` (`approved→completed`). `awardPoints` = bonus langsung
(ortu bebas, kakek/nenek max 50).

## 3. Screen time
Ortu `updateScreenTimeLimit` (0–1440) → anak `startScreenTimeSession`
(blokir sesi ganda, auto-reset harian, kunci jika habis) →
`endScreenTimeSession` (owner/ortu; kurangi bonus dulu, lock jika habis) +
`reportDeviceData` (baterai/lokasi/app_usage).

## 4. Komunikasi & rumah
Chat ruang (`room_messages`, guard `canAccessRoom`) + DM + `notifyNewMessage`;
kontrak (`agreed_parents+children→signed_at`); lokasi (`updateMemberLocation`,
adik tak bisa pindah sendiri); `applyFamilyMode` manual / `applyAllFamilyModes`
cron 30 mnt (pindah kakak/adik sesuai jadwal); `updateVirtualHome` + `buyFurniture`.

## 5. AI & Premium
`generateWeeklyReport` (agregat 7 hari → OpenAI `headline/highlights/balance/suggestion`,
ekspor PDF) ; `analyzeFamilyCommunication` (ortu saja, 80 pesan → statistik pola,
tanpa kutip isi). `createCheckoutSession` → Stripe → `webhooks/stripe` update
`subscriptions`; `checkSubscription`/`setFamilySubscription`; admin
`getAdminStats/adminDeleteFamily/adminUpdateFamily`, `deleteFamilyData` (founder),
`deleteMyAccount`.
