alter table public.events
  add column if not exists approved boolean not null default false,
  add column if not exists approved_at timestamptz;
