# API_DOCS — `/api/functions/:name` (POST JSON, header `Authorization: Bearer <supabase_jwt>`)

## Keluarga
- `createFamily{family_name,full_name,family_role}` → `{family_id,invite_code,member_id}`
- `joinFamily{invite_code,full_name,family_role}` → `{family_id,member_id,rejoined?}`
- `getMyFamily{}` → `{family,members,rooms,my_member}`
- `inviteMember{email,role}` · `checkInvitation{}` → `{has_invitation,…}` · `acceptInvitation{invitation_id,full_name}`
- `updateMemberRole{member_id,new_role}` · `updateMemberLocation{member_id,location,outside_location_name?}`
- `updateProfile{full_name?,phone?,avatar_url?,avatar_config?}` · `updateVirtualHome{virtual_home_config}`
- `deleteFamilyData{confirm:<nama_keluarga>}` · `deleteMyAccount{}`

## Tugas & poin
- `completeTask{task_id,action:complete|approve|reject}`
- `awardPoints{member_id,points(1–1000),description?}`
- `requestRedemption{points,type:redeemed_for_screen_time|redeemed_for_cash,description?}`
- `approvePointTransaction{transaction_id,action:approve|reject}`
- `confirmReceiveCash{transaction_id}` · `buyFurniture{type,room,pos_x?,pos_z?}`

## Screen time
- `updateScreenTimeLimit{member_id,daily_limit_minutes}` · `startScreenTimeSession{}`
- `endScreenTimeSession{session_id,forced_by_name?}` · `reportDeviceData{battery_level?,is_charging?,location_lat?,location_lng?,location_name?,app_usage?[]}`

## Mode, notif, laporan, billing, admin
- `applyFamilyMode{schedule_id}` · `applyAllFamilyModes{}` (juga GET cron)
- `notifyNewMessage{message_id,message_type:room|direct}` · `notifyTaskAssigned{task_id}`
- `generateWeeklyReport{}` → `{stats,report}` · `analyzeFamilyCommunication{}` → `{analysis}`
- `checkSubscription{}` → `{plan,status,isPremium}` · `createCheckoutSession{plan}` → `{url}`
- `setFamilySubscription{family_id,plan}` · `getAdminStats{}` · `adminUpdateFamily{family_id,…}` · `adminDeleteFamily{family_id}`

## Webhook & cron
- `POST /api/webhooks/stripe` (raw body, header `stripe-signature`)
- `GET|POST /api/cron/apply-all-family-modes`

Semua error: `{error:<pesan>}` + status 400/401/403/404/500.
Frontend memanggil via `base44.functions.invoke(name, payload)` (`src/api/functions.js`).
