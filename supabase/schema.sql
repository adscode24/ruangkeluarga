-- Ruang Keluarga — Supabase Postgres schema
-- Jalankan di Supabase Dashboard > SQL Editor (atau `supabase db push`).
-- Urutan: extension -> tables -> indexes -> triggers.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============ profiles (pengganti User Base44) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  family_id uuid,
  last_active timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ families ============
create table if not exists public.families (
  id uuid primary key default uuid_generate_v4(),
  family_name text not null,
  invite_code text not null unique,
  virtual_home_config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ family_members ============
create table if not exists public.family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  avatar_config jsonb not null default '{}'::jsonb,
  family_role text not null check (family_role in ('ayah','ibu','kakak','adik','kakek','nenek','om','tante')),
  is_founder boolean not null default false,
  current_location text not null default 'ruang_keluarga'
    check (current_location in ('ruang_keluarga','kamar_orang_tua','kamar_kakak','kamar_adik','luar_rumah')),
  outside_location_name text not null default '',
  points_balance integer not null default 0,
  streak_days integer not null default 0,
  last_task_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_members_family on public.family_members(family_id);
create index if not exists idx_members_user on public.family_members(user_id);

-- ============ family_rooms ============
create table if not exists public.family_rooms (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  room_name text not null check (room_name in ('ruang_keluarga','kamar_orang_tua','kamar_kakak','kamar_adik')),
  room_description text,
  allowed_roles text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rooms_family on public.family_rooms(family_id);

-- ============ family_tasks ============
create table if not exists public.family_tasks (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  points_reward integer not null default 10,
  assigned_to_id uuid references public.family_members(id) on delete set null,
  assigned_to_name text,
  status text not null default 'pending' check (status in ('pending','completed','approved','rejected')),
  completed_at timestamptz,
  created_by_name text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_family on public.family_tasks(family_id);
create index if not exists idx_tasks_assignee on public.family_tasks(assigned_to_id);

-- ============ family_contracts ============
create table if not exists public.family_contracts (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  rules text[] not null default '{}',
  agreed_by_parents boolean not null default false,
  agreed_by_children boolean not null default false,
  signed_at timestamptz,
  created_by_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contracts_family on public.family_contracts(family_id);

-- ============ family_schedules ============
create table if not exists public.family_schedules (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  mode text not null check (mode in ('sekolah','ramadan','libur','belajar')),
  label text,
  start_time text not null,
  end_time text not null,
  days text[] not null default '{}',
  auto_location text not null check (auto_location in ('ruang_keluarga','kamar_orang_tua','kamar_kakak','kamar_adik','luar_rumah')),
  outside_label text,
  is_active boolean not null default true,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_schedules_family on public.family_schedules(family_id);

-- ============ family_invitations ============
create table if not exists public.family_invitations (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  role text not null check (role in ('ayah','ibu','kakak','adik','kakak','adik','kakek','nenek','om','tante','ayah','ibu')),
  invited_by_name text,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invitations_family on public.family_invitations(family_id);
create index if not exists idx_invitations_email on public.family_invitations(email);

-- ============ point_transactions ============
create table if not exists public.point_transactions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null,
  type text not null check (type in ('earned','redeemed_for_screen_time','redeemed_for_cash','bonus')),
  points integer not null,
  description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  approved_by_id uuid,
  approved_by_name text,
  cash_amount integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tx_family on public.point_transactions(family_id);
create index if not exists idx_tx_member on public.point_transactions(member_id);

-- ============ screen_time_limits ============
create table if not exists public.screen_time_limits (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null unique references public.family_members(id) on delete cascade,
  member_name text not null,
  daily_limit_minutes integer not null default 120,
  used_today_minutes integer not null default 0,
  last_reset_date date,
  bonus_minutes integer not null default 0,
  is_locked boolean not null default false,
  set_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ screen_time_sessions ============
create table if not exists public.screen_time_sessions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  member_name text not null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration_minutes integer,
  status text not null default 'active' check (status in ('active','ended','forced_end')),
  ended_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sessions_member on public.screen_time_sessions(member_id);

-- ============ room_messages ============
create table if not exists public.room_messages (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  room_id uuid references public.family_rooms(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text,
  sender_role text,
  message_type text not null default 'text' check (message_type in ('text','image','voice','sticker','system_notification')),
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_roommsg_family on public.room_messages(family_id);
create index if not exists idx_roommsg_room on public.room_messages(room_id);

-- ============ direct_messages ============
create table if not exists public.direct_messages (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_dm_family on public.direct_messages(family_id);

-- ============ notifications ============
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  related_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id);

-- ============ furniture ============
create table if not exists public.furniture (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  type text not null check (type in ('sofa','bed','table','plant','tv','desk','bookshelf','toybox','lamp','rug')),
  label text,
  room text not null check (room in ('ruang_keluarga','kamar_orang_tua','kamar_kakak','kamar_adik')),
  pos_x double precision,
  pos_z double precision,
  cost integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ subscriptions ============
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null unique references public.families(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium_monthly','premium_yearly')),
  status text not null default 'active' check (status in ('active','canceled','past_due','trialing')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ device_reports ============
create table if not exists public.device_reports (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null unique references public.family_members(id) on delete cascade,
  battery_level integer,
  is_charging boolean not null default false,
  location_lat double precision,
  location_lng double precision,
  location_name text,
  app_usage jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ updated_at trigger ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','families','family_members','family_rooms','family_tasks','family_contracts','family_schedules','family_invitations','point_transactions','screen_time_limits','screen_time_sessions','room_messages','direct_messages','notifications','furniture','subscriptions','device_reports']
  loop
    execute format('drop trigger if exists trg_touch_%s on public.%s', t, t);
    execute format('create trigger trg_touch_%s before update on public.%s for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ============ auto-create profile on signup ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'user')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
