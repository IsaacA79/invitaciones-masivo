-- 1) Flag de ocultar (soft-hide)
alter table public.events
add column if not exists hidden boolean not null default false;

-- 2) Metadata opcional (quién/cuándo lo ocultó)
alter table public.events
add column if not exists hidden_at timestamptz;

alter table public.events
add column if not exists hidden_by uuid;

create index if not exists events_hidden_idx on public.events (hidden);
