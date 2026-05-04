-- AI Automation Center schema draft (design phase only)
-- No runtime automation logic is implemented in this phase.

create table if not exists automation_queue (
  id text primary key,
  session_id text not null,
  branch_id text not null,
  queue_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING',
  requested_by text not null,
  requested_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  error_message text null
);

create index if not exists idx_automation_queue_session
  on automation_queue (session_id, status, requested_at desc);

create table if not exists automation_logs (
  id text primary key,
  queue_id text not null references automation_queue(id),
  session_id text not null,
  branch_id text not null,
  level text not null,
  message text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_logs_queue
  on automation_logs (queue_id, created_at desc);
