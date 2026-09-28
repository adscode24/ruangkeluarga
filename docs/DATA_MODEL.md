# DATA_MODEL (→ `supabase/schema.sql`)

Tenant = `families.id`, dipegang `profiles.family_id`.
Semua tabel domain punya `family_id` kecuali `profiles/families`.

| Tabel | Kunci & field penting |
|---|---|
| profiles | id (auth.users), email, full_name, role[admin/user], family_id, last_active |
| families | family_name, invite_code UNIQUE 6-char, virtual_home_config jsonb |
| family_members | family_id, user_id, full_name, family_role[8 peran], is_founder, current_location[5], outside_location_name, points_balance, streak_days, last_task_date, is_active |
| family_rooms | family_id, room_name[4], allowed_roles[] |
| furniture | family_id, type[10], room, pos_x/pos_z, cost |
| family_tasks | family_id, title, points_reward=10, assigned_to_id→members, status[pending/completed/approved/rejected] |
| point_transactions | family_id, member_id, user_id, type[earned/redeemed_for_screen_time/redeemed_for_cash/bonus], points (±), status[pending/approved/rejected/completed], cash_amount |
| screen_time_limits | member_id UNIQUE, daily_limit_minutes=120, used_today, last_reset_date, bonus_minutes, is_locked |
| screen_time_sessions | member_id, start/end_time, duration_minutes, status[active/ended/forced_end] |
| room_messages | family_id, room_id, sender_id/name/role, message_type[5], content, is_pinned |
| direct_messages | family_id, sender/receiver_id, content, read_at |
| notifications | family_id, user_id, title/body/type[10], related_id, is_read |
| family_contracts | family_id, title, rules[], agreed_by_parents/children, signed_at |
| family_schedules | family_id, mode[sekolah/ramadan/libur/belajar], start/end HH:MM, days[], auto_location, outside_label |
| family_invitations | family_id, email, role, status[pending/accepted] |
| subscriptions | family_id UNIQUE, plan[free/premium_*], status, stripe_* |
| device_reports | member_id UNIQUE, battery/is_charging, lat/lng/name, app_usage[] |

Relasi: Family 1—* semua tabel; Member.user_id→profiles; Task/Transaction/Limit/Session/Device→Member.
RLS (`rls.sql`): client hanya bisa akses `family_id = my_family_id()`; backend service_role bypass.
