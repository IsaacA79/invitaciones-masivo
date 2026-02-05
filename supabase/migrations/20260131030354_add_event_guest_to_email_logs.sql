-- 0) Asegura pgcrypto por si no está (por gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Agregar columnas (idempotente)
alter table public.email_logs
  add column if not exists event_id uuid,
  add column if not exists guest_id uuid;

-- 2) Backfill desde invitations (solo donde falte)
update public.email_logs l
set
  event_id = i.event_id,
  guest_id = i.guest_id
from public.invitations i
where i.id = l.invitation_id
  and (l.event_id is null or l.guest_id is null);

-- 3) Índices para reportes
create index if not exists email_logs_event_created_idx
  on public.email_logs (event_id, created_at desc);

create index if not exists email_logs_guest_id_idx
  on public.email_logs (guest_id);

create index if not exists email_logs_status_idx
  on public.email_logs (status);

create index if not exists email_logs_invitation_id_idx
  on public.email_logs (invitation_id);

-- 4) Foreign Keys (idempotentes)
do $$
begin
  alter table public.email_logs
    add constraint email_logs_invitation_id_fkey
    foreign key (invitation_id)
    references public.invitations(id)
    on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.email_logs
    add constraint email_logs_event_id_fkey
    foreign key (event_id)
    references public.events(id)
    on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.email_logs
    add constraint email_logs_guest_id_fkey
    foreign key (guest_id)
    references public.guests(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

-- 5) (Opcional pero recomendado) Asegurar valores NOT NULL para datos nuevos
-- Si estás seguro de que SIEMPRE habrá invitation->event/guest en adelante:
-- Primero valida que ya no haya nulls por datos antiguos inconsistentes:
-- select count(*) from public.email_logs where event_id is null or guest_id is null;

-- Luego podrías forzar NOT NULL:
-- alter table public.email_logs alter column event_id set not null;
-- alter table public.email_logs alter column guest_id set not null;
