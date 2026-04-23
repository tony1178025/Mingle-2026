create table if not exists hqs (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id text primary key,
  hq_id text not null references hqs(id) on delete cascade,
  name text not null,
  venue_name text not null,
  venue_address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  hq_id text not null references hqs(id) on delete cascade,
  branch_id text not null references branches(id) on delete cascade,
  name text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  name text not null,
  hq_id text not null references hqs(id) on delete cascade,
  branch_id text not null references branches(id) on delete cascade,
  branch_name text not null,
  event_id text not null references events(id) on delete cascade,
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
  updated_at timestamptz not null,
  table_count integer not null,
  table_capacity integer not null,
  customer_session_version integer not null default 1,
  authority_backend text not null default 'FILE',
  active_content_ids jsonb not null default '[]'::jsonb,
  snapshot_version integer not null default 1,
  snapshot_json jsonb not null
);

create table if not exists reservations (
  id text primary key,
  session_id text not null references sessions(id) on delete cascade,
  branch_id text not null references branches(id) on delete cascade,
  reservation_external_id text null,
  participant_id text null,
  phone text null,
  status text not null default 'ACTIVE',
  updated_at timestamptz not null default now()
);

create table if not exists participants (
  id text primary key,
  session_id text not null references sessions(id) on delete cascade,
  branch_id text not null references branches(id) on delete cascade,
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
  met_participant_ids jsonb not null default '[]'::jsonb,
  encounter_history jsonb not null default '[]'::jsonb,
  liked_participant_ids jsonb not null default '[]'::jsonb,
  liked_by_participant_ids jsonb not null default '[]'::jsonb,
  popularity_score numeric not null default 0,
  tier text not null,
  sub_tier text not null,
  score numeric not null default 0,
  attraction_score numeric not null default 0,
  engagement_score numeric not null default 0,
  is_vip boolean not null default false,
  is_high_value boolean not null default false,
  joined_at timestamptz not null,
  last_active_at timestamptz null
);

create index if not exists idx_sessions_branch_id on sessions(branch_id);
create index if not exists idx_sessions_event_id on sessions(event_id);
create index if not exists idx_reservations_session_id on reservations(session_id);
create index if not exists idx_participants_session_id on participants(session_id);
create index if not exists idx_participants_branch_id on participants(branch_id);
