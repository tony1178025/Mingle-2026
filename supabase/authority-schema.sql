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

create or replace function public.apply_db_authority_projection(projection jsonb)
returns void
language plpgsql
as $$
declare
  session_id_text text := projection #>> '{session,id}';
begin
  if session_id_text is null or length(trim(session_id_text)) = 0 then
    raise exception 'session.id is required in projection payload';
  end if;

  insert into public.hqs (id, name, created_at, updated_at)
  select
    projection #>> '{hq,id}',
    projection #>> '{hq,name}',
    (projection #>> '{hq,created_at}')::timestamptz,
    (projection #>> '{hq,updated_at}')::timestamptz
  on conflict (id) do update
  set
    name = excluded.name,
    updated_at = excluded.updated_at;

  insert into public.branches (
    id, hq_id, name, venue_name, venue_address,
    default_max_capacity, default_table_count, is_active, created_at, updated_at, updated_by
  )
  select
    projection #>> '{branch,id}',
    projection #>> '{branch,hq_id}',
    projection #>> '{branch,name}',
    projection #>> '{branch,venue_name}',
    projection #>> '{branch,venue_address}',
    coalesce((projection #>> '{branch,default_max_capacity}')::integer, 30),
    coalesce((projection #>> '{branch,default_table_count}')::integer, 5),
    coalesce((projection #>> '{branch,is_active}')::boolean, true),
    (projection #>> '{branch,created_at}')::timestamptz,
    (projection #>> '{branch,updated_at}')::timestamptz,
    projection #>> '{branch,updated_by}'
  on conflict (id) do update
  set
    hq_id = excluded.hq_id,
    name = excluded.name,
    venue_name = excluded.venue_name,
    venue_address = excluded.venue_address,
    default_max_capacity = excluded.default_max_capacity,
    default_table_count = excluded.default_table_count,
    is_active = excluded.is_active,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

  insert into public.events (id, hq_id, branch_id, name, status, created_at, updated_at)
  select
    projection #>> '{event,id}',
    projection #>> '{event,hq_id}',
    projection #>> '{event,branch_id}',
    projection #>> '{event,name}',
    projection #>> '{event,status}',
    (projection #>> '{event,created_at}')::timestamptz,
    (projection #>> '{event,updated_at}')::timestamptz
  on conflict (id) do update
  set
    hq_id = excluded.hq_id,
    branch_id = excluded.branch_id,
    name = excluded.name,
    status = excluded.status,
    updated_at = excluded.updated_at;

  insert into public.sessions (
    id, name, hq_id, branch_id, branch_name, event_id, venue_name, venue_address,
    session_date_label, session_time_label, attendance_label, attendance_hint, code, phase,
    reveal_senders, reveal_triggered_at, started_at, created_at, updated_at, table_count,
    table_capacity, max_capacity, status, customer_session_version, active_content_ids,
    snapshot_version, authority_backend, snapshot_json, updated_by
  )
  select
    projection #>> '{session,id}',
    projection #>> '{session,name}',
    projection #>> '{session,hq_id}',
    projection #>> '{session,branch_id}',
    projection #>> '{session,branch_name}',
    projection #>> '{session,event_id}',
    projection #>> '{session,venue_name}',
    projection #>> '{session,venue_address}',
    projection #>> '{session,session_date_label}',
    projection #>> '{session,session_time_label}',
    projection #>> '{session,attendance_label}',
    projection #>> '{session,attendance_hint}',
    projection #>> '{session,code}',
    projection #>> '{session,phase}',
    coalesce((projection #>> '{session,reveal_senders}')::boolean, false),
    (projection #>> '{session,reveal_triggered_at}')::timestamptz,
    (projection #>> '{session,started_at}')::timestamptz,
    coalesce((projection #>> '{session,created_at}')::timestamptz, (projection #>> '{session,started_at}')::timestamptz),
    (projection #>> '{session,updated_at}')::timestamptz,
    (projection #>> '{session,table_count}')::integer,
    (projection #>> '{session,table_capacity}')::integer,
    coalesce((projection #>> '{session,max_capacity}')::integer, 30),
    coalesce(projection #>> '{session,status}', 'OPEN'),
    coalesce((projection #>> '{session,customer_session_version}')::integer, 1),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(projection #> '{session,active_content_ids}', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce((projection #>> '{session,snapshot_version}')::integer, 0),
    coalesce(projection #>> '{session,authority_backend}', 'DB'),
    projection #> '{session,snapshot_json}',
    projection #>> '{session,updated_by}'
  on conflict (id) do update
  set
    name = excluded.name,
    hq_id = excluded.hq_id,
    branch_id = excluded.branch_id,
    branch_name = excluded.branch_name,
    event_id = excluded.event_id,
    venue_name = excluded.venue_name,
    venue_address = excluded.venue_address,
    session_date_label = excluded.session_date_label,
    session_time_label = excluded.session_time_label,
    attendance_label = excluded.attendance_label,
    attendance_hint = excluded.attendance_hint,
    code = excluded.code,
    phase = excluded.phase,
    reveal_senders = excluded.reveal_senders,
    reveal_triggered_at = excluded.reveal_triggered_at,
    started_at = excluded.started_at,
    updated_at = excluded.updated_at,
    table_count = excluded.table_count,
    table_capacity = excluded.table_capacity,
    max_capacity = excluded.max_capacity,
    status = excluded.status,
    customer_session_version = excluded.customer_session_version,
    active_content_ids = excluded.active_content_ids,
    snapshot_version = excluded.snapshot_version,
    authority_backend = excluded.authority_backend,
    snapshot_json = excluded.snapshot_json,
    updated_by = excluded.updated_by;

  delete from public.participants where session_id = session_id_text;
  insert into public.participants
  select *
  from jsonb_populate_recordset(null::public.participants, coalesce(projection -> 'participants', '[]'::jsonb));

  delete from public.reservations where session_id = session_id_text;
  insert into public.reservations
  select *
  from jsonb_populate_recordset(null::public.reservations, coalesce(projection -> 'reservations', '[]'::jsonb));

  delete from public.blacklist where session_id = session_id_text;
  insert into public.blacklist
  select *
  from jsonb_populate_recordset(null::public.blacklist, coalesce(projection -> 'blacklist', '[]'::jsonb));

  delete from public.incidents where session_id = session_id_text;
  insert into public.incidents
  select *
  from jsonb_populate_recordset(null::public.incidents, coalesce(projection -> 'incidents', '[]'::jsonb));
end;
$$;
