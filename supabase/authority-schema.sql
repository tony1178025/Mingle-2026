-- Fifth stabilization pass
-- This schema stages DB-backed authority in parallel with the existing file-backed authority.
-- Runtime can dual-read/write through the repository abstraction while snapshot_json preserves
-- existing behavior during migration.

create table if not exists public.hqs (
  id text primary key,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branches (
  id text primary key,
  hq_id text not null references public.hqs(id) on delete cascade,
  name text not null,
  venue_name text not null,
  venue_address text not null,
  default_max_capacity integer not null default 30,
  default_table_count integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by text null
);

create table if not exists public.events (
  id text primary key,
  hq_id text not null references public.hqs(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  name text not null,
  status text not null check (status in ('ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sessions (
  id text primary key,
  name text not null,
  hq_id text not null references public.hqs(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  branch_name text not null,
  event_id text not null references public.events(id) on delete cascade,
  venue_name text not null,
  venue_address text not null,
  session_date_label text not null,
  session_time_label text not null,
  attendance_label text not null,
  attendance_hint text not null,
  code text not null,
  phase text not null,
  reveal_senders boolean not null default false,
  reveal_triggered_at timestamptz null,
  started_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null,
  table_count integer not null,
  table_capacity integer not null,
  max_capacity integer not null default 30,
  status text not null default 'OPEN' check (status in ('DRAFT', 'OPEN', 'CLOSED', 'DISABLED')),
  customer_session_version integer not null default 1,
  active_content_ids text[] not null default '{}',
  snapshot_version integer not null default 0,
  authority_backend text not null default 'FILE' check (authority_backend in ('FILE', 'DB')),
  snapshot_json jsonb not null default '{}'::jsonb,
  updated_by text null
);

create table if not exists public.participants (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  reservation_id text null,
  reservation_external_id text null,
  phone text null,
  nickname text not null,
  gender text not null,
  age integer not null,
  job_category text not null,
  job text not null,
  photo_url text null,
  height_cm integer not null,
  animal_type text not null,
  energy_type text not null,
  checkin_mode text not null,
  table_id integer not null,
  round2_attendance text not null,
  received_hearts integer not null default 0,
  sent_hearts integer not null default 0,
  profile_views integer not null default 0,
  hearts_remaining integer not null default 0,
  met_participant_ids text[] not null default '{}',
  encounter_history jsonb not null default '[]'::jsonb,
  liked_participant_ids text[] not null default '{}',
  liked_by_participant_ids text[] not null default '{}',
  popularity_score double precision not null default 0,
  tier text not null,
  sub_tier text not null,
  score double precision not null default 0,
  attraction_score double precision not null default 0,
  engagement_score double precision not null default 0,
  is_vip boolean not null default false,
  is_high_value boolean not null default false,
  joined_at timestamptz not null,
  last_active_at timestamptz null
);

create table if not exists public.reservations (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  reservation_external_id text null,
  participant_id text null references public.participants(id) on delete set null,
  phone text null,
  status text not null check (status in ('ACTIVE', 'BLOCKED')),
  updated_at timestamptz not null
);

create table if not exists public.admin_users (
  id text primary key,
  email text null unique,
  password_hash text not null,
  role text not null check (role in ('HQ_ADMIN', 'BRANCH_ADMIN', 'STAFF')),
  branch_id text null references public.branches(id) on delete set null,
  is_active boolean not null default true,
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz null,
  updated_by text null
);

alter table public.branches add column if not exists default_max_capacity integer not null default 30;
alter table public.branches add column if not exists default_table_count integer not null default 5;
alter table public.branches add column if not exists is_active boolean not null default true;
alter table public.branches add column if not exists updated_by text null;

alter table public.sessions add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.sessions add column if not exists max_capacity integer not null default 30;
alter table public.sessions add column if not exists status text not null default 'OPEN';
alter table public.sessions add column if not exists updated_by text null;
alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check
  check (status in ('DRAFT', 'OPEN', 'CLOSED', 'DISABLED'));

alter table public.admin_users add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.admin_users add column if not exists last_login_at timestamptz null;
alter table public.admin_users add column if not exists updated_by text null;
alter table public.admin_users drop constraint if exists admin_users_password_hash_key;

create table if not exists public.blacklist (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  participant_id text not null references public.participants(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null
);

create table if not exists public.incidents (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  reporter_id text null references public.participants(id) on delete set null,
  target_id text null references public.participants(id) on delete set null,
  type text not null check (
    type in ('REPORT_SUBMITTED', 'BLACKLIST_BLOCKED', 'HIGH_FREQUENCY_ACTION', 'SUSPICIOUS_PATTERN')
  ),
  message text not null,
  timestamp timestamptz not null
);

create index if not exists idx_sessions_branch_id on public.sessions(branch_id);
create index if not exists idx_sessions_event_id on public.sessions(event_id);
create index if not exists idx_participants_session_id on public.participants(session_id);
create index if not exists idx_participants_branch_id on public.participants(branch_id);
create index if not exists idx_participants_reservation_external_id on public.participants(reservation_external_id);
create index if not exists idx_reservations_session_id on public.reservations(session_id);
create index if not exists idx_reservations_external_id on public.reservations(reservation_external_id);
create index if not exists idx_admin_users_role on public.admin_users(role);
create index if not exists idx_admin_users_branch_id on public.admin_users(branch_id);
create index if not exists idx_admin_users_email on public.admin_users(email);
create index if not exists idx_blacklist_session_id on public.blacklist(session_id);
create index if not exists idx_blacklist_participant_id on public.blacklist(participant_id);
create index if not exists idx_incidents_session_id on public.incidents(session_id);
create index if not exists idx_incidents_target_id on public.incidents(target_id);
