-- RLS: service_role (backend /api) bypass RLS otomatis.
-- Policy di bawah untuk client browser (anon/authenticated) — prinsip: satu keluarga hanya bisa
-- akses datanya sendiri (family_id sama dengan profiles.family_id miliknya).

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_rooms enable row level security;
alter table public.family_tasks enable row level security;
alter table public.family_contracts enable row level security;
alter table public.family_schedules enable row level security;
alter table public.family_invitations enable row level security;
alter table public.point_transactions enable row level security;
alter table public.screen_time_limits enable row level security;
alter table public.screen_time_sessions enable row level security;
alter table public.room_messages enable row level security;
alter table public.direct_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.furniture enable row level security;
alter table public.subscriptions enable row level security;
alter table public.device_reports enable row level security;

-- helper: family_id milik user login
create or replace function public.my_family_id()
returns uuid language sql stable as $$
  select family_id from public.profiles where id = auth.uid()
$$;

-- profiles: user bisa baca/update dirinya sendiri
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- families: hanya anggota keluarga yang sama
drop policy if exists "families_member" on public.families;
create policy "families_member" on public.families
  for all using (id = public.my_family_id()) with check (id = public.my_family_id());

-- Pola umum: read/write jika family_id = milikku
do $$
declare t text;
begin
  foreach t in array array[
    'family_members','family_rooms','family_tasks','family_contracts','family_schedules',
    'family_invitations','point_transactions','screen_time_limits','screen_time_sessions',
    'room_messages','direct_messages','furniture','device_reports'
  ]
  loop
    execute format('drop policy if exists "%s_member" on public.%s', t, t);
    execute format('create policy "%s_member" on public.%s for all using (family_id = public.my_family_id()) with check (family_id = public.my_family_id())', t, t);
  end loop;
end $$;

-- notifications: hanya milikku
drop policy if exists "notifications_owner" on public.notifications;
create policy "notifications_owner" on public.notifications
  for all using (user_id = auth.uid()) with check (family_id = public.my_family_id());

-- subscriptions: read anggota, write hanya via service_role (backend)
drop policy if exists "subscriptions_read" on public.subscriptions;
create policy "subscriptions_read" on public.subscriptions
  for select using (family_id = public.my_family_id());
