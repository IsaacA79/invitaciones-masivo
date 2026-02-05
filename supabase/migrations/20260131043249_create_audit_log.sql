-- (Opcional) si no tienes pgcrypto habilitado
create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  -- quién ejecutó la acción (admin)
  actor_id uuid not null,

  -- qué acción
  action text not null,

  -- sobre quién/qué (usuario afectado)
  target_id uuid null,
  target_email text null,

  -- observabilidad
  ip inet null,
  user_agent text null,

  -- datos extra (NO sensibles)
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- índices para reportes
create index if not exists audit_logs_created_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);

create index if not exists audit_logs_action_created_idx
  on public.audit_logs (action, created_at desc);

-- RLS (solo admins pueden leer desde cliente; service_role igual puede)
alter table public.audit_logs enable row level security;

drop policy if exists "admins can read audit logs" on public.audit_logs;

create policy "admins can read audit logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- No creamos policy de insert/update/delete:
-- los inserts los haces desde server con service_role (bypassa RLS).
