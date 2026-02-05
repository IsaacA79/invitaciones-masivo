-- Asegura columna (si ya existe, no hace nada)
alter table public.events
add column if not exists approved boolean not null default false;

-- Función guardia: solo admin (o service_role) puede cambiar approved/owner_id
create or replace function public.guard_events_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  -- Service role (backend) permitido
  if current_user = 'service_role' then
    return new;
  end if;

  -- Debe estar autenticado
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) into is_admin;

  -- Solo admin puede cambiar approved
  if new.approved is distinct from old.approved then
    if not is_admin then
      raise exception 'Only admin can change approved';
    end if;
  end if;

  -- (Recomendado) Solo admin puede cambiar owner_id
  if new.owner_id is distinct from old.owner_id then
    if not is_admin then
      raise exception 'Only admin can change owner_id';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_events_guard_sensitive_fields on public.events;

create trigger trg_events_guard_sensitive_fields
before update on public.events
for each row
execute function public.guard_events_sensitive_fields();
