-- RLS / Policies baseline
-- Ajustado para: events, guests, invitations, email_logs, profiles (+ opcional event_members)

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin(_uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = _uid
      and p.role = 'admin'
  );
$$;

-- Devuelve TRUE si existe event_members y el usuario es miembro del evento
create or replace function public.is_event_member(_event_id uuid, _uid uuid)
returns boolean
language plpgsql
stable
as $$
begin
  if _uid is null then
    return false;
  end if;

  if to_regclass('public.event_members') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.event_members em
    where em.event_id = _event_id
      and em.user_id = _uid
  );
end;
$$;

-- TRUE si existe event_members.role y el usuario tiene alguno de esos roles en el evento
create or replace function public.event_member_has_role(_event_id uuid, _uid uuid, _roles text[])
returns boolean
language plpgsql
stable
as $$
declare
  has_role_col boolean;
begin
  if _uid is null then
    return false;
  end if;

  if to_regclass('public.event_members') is null then
    return false;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_members'
      and column_name = 'role'
  ) into has_role_col;

  if not has_role_col then
    return false;
  end if;

  return exists (
    select 1
    from public.event_members em
    where em.event_id = _event_id
      and em.user_id = _uid
      and em.role = any(_roles)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Triggers de protección (evitan escalamiento por UPDATE)
-- ─────────────────────────────────────────────────────────────

create or replace function public.tg_protect_events_owner_id()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    if not public.is_admin(auth.uid()) then
      raise exception 'owner_id cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.tg_protect_guests_event_id()
returns trigger
language plpgsql
as $$
begin
  if new.event_id is distinct from old.event_id then
    if not public.is_admin(auth.uid()) then
      raise exception 'event_id cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- PROFILES (global roles)
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  execute 'alter table public.profiles enable row level security';

  execute 'drop policy if exists profiles_select_own on public.profiles';
  execute 'drop policy if exists profiles_insert_own on public.profiles';
  execute 'drop policy if exists profiles_update_admin on public.profiles';

  execute $pol$
    create policy profiles_select_own
    on public.profiles
    for select
    using (
      auth.role() = 'authenticated'
      and (id = auth.uid() or public.is_admin(auth.uid()))
    )
  $pol$;

  -- por si necesitas crear profile manualmente (normalmente lo hace un trigger)
  execute $pol$
    create policy profiles_insert_own
    on public.profiles
    for insert
    with check (
      auth.role() = 'authenticated'
      and (id = auth.uid() or public.is_admin(auth.uid()))
    )
  $pol$;

  -- cambios de rol: SOLO admin (tu API ya usa service_role, pero esto cierra la puerta por sesión)
  execute $pol$
    create policy profiles_update_admin
    on public.profiles
    for update
    using (public.is_admin(auth.uid()))
    with check (public.is_admin(auth.uid()))
  $pol$;

end $$;

-- ─────────────────────────────────────────────────────────────
-- EVENTS
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.events') is null then
    return;
  end if;

  execute 'alter table public.events enable row level security';

  execute 'drop policy if exists events_select on public.events';
  execute 'drop policy if exists events_insert on public.events';
  execute 'drop policy if exists events_update on public.events';
  execute 'drop policy if exists events_delete on public.events';

  execute $pol$
    create policy events_select
    on public.events
    for select
    using (
      auth.role() = 'authenticated'
      and (
        owner_id = auth.uid()
        or public.is_admin(auth.uid())
        or public.is_event_member(id, auth.uid())
      )
    )
  $pol$;

  execute $pol$
    create policy events_insert
    on public.events
    for insert
    with check (
      auth.role() = 'authenticated'
      and (
        owner_id = auth.uid()
        or public.is_admin(auth.uid())
      )
    )
  $pol$;

  -- Update permitido para:
  -- - owner
  -- - admin
  -- - miembro con rol "admin|owner|capturista|designer" (si existe role en event_members)
  execute $pol$
    create policy events_update
    on public.events
    for update
    using (
      auth.role() = 'authenticated'
      and (
        owner_id = auth.uid()
        or public.is_admin(auth.uid())
        or public.event_member_has_role(id, auth.uid(), array['admin','owner','capturista','designer'])
      )
    )
    with check (
      auth.role() = 'authenticated'
      and (
        owner_id = auth.uid()
        or public.is_admin(auth.uid())
        or public.event_member_has_role(id, auth.uid(), array['admin','owner','capturista','designer'])
      )
    )
  $pol$;

  execute $pol$
    create policy events_delete
    on public.events
    for delete
    using (
      auth.role() = 'authenticated'
      and (
        owner_id = auth.uid()
        or public.is_admin(auth.uid())
      )
    )
  $pol$;

  -- Trigger anti-cambio de owner_id
  execute 'drop trigger if exists protect_events_owner_id on public.events';
  execute 'create trigger protect_events_owner_id before update on public.events for each row execute function public.tg_protect_events_owner_id()';

end $$;

-- ─────────────────────────────────────────────────────────────
-- GUESTS
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.guests') is null then
    return;
  end if;

  execute 'alter table public.guests enable row level security';

  execute 'drop policy if exists guests_select on public.guests';
  execute 'drop policy if exists guests_insert on public.guests';
  execute 'drop policy if exists guests_update on public.guests';
  execute 'drop policy if exists guests_delete on public.guests';

  -- Leer invitados si puedes leer el evento
  execute $pol$
    create policy guests_select
    on public.guests
    for select
    using (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.events e
        where e.id = guests.event_id
          and (
            e.owner_id = auth.uid()
            or public.is_admin(auth.uid())
            or public.is_event_member(e.id, auth.uid())
          )
      )
    )
  $pol$;

  -- Editar lista SOLO:
  -- - owner
  -- - admin
  -- - capturista global (profiles.role) con membresía del evento (si existe event_members)
  -- - miembro con rol admin|owner|capturista (si existe event_members.role)
  execute $pol$
    create policy guests_insert
    on public.guests
    for insert
    with check (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.events e
        where e.id = guests.event_id
          and (
            e.owner_id = auth.uid()
            or public.is_admin(auth.uid())
            or public.event_member_has_role(e.id, auth.uid(), array['admin','owner','capturista'])
            or (
              exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'capturista')
              and public.is_event_member(e.id, auth.uid())
            )
          )
      )
    )
  $pol$;

  execute $pol$
    create policy guests_update
    on public.guests
    for update
    using (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.events e
        where e.id = guests.event_id
          and (
            e.owner_id = auth.uid()
            or public.is_admin(auth.uid())
            or public.event_member_has_role(e.id, auth.uid(), array['admin','owner','capturista'])
            or (
              exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'capturista')
              and public.is_event_member(e.id, auth.uid())
            )
          )
      )
    )
    with check (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.events e
        where e.id = guests.event_id
          and (
            e.owner_id = auth.uid()
            or public.is_admin(auth.uid())
            or public.event_member_has_role(e.id, auth.uid(), array['admin','owner','capturista'])
            or (
              exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'capturista')
              and public.is_event_member(e.id, auth.uid())
            )
          )
      )
    )
  $pol$;

  execute $pol$
    create policy guests_delete
    on public.guests
    for delete
    using (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.events e
        where e.id = guests.event_id
          and (
            e.owner_id = auth.uid()
            or public.is_admin(auth.uid())
            or public.event_member_has_role(e.id, auth.uid(), array['admin','owner','capturista'])
            or (
              exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'capturista')
              and public.is_event_member(e.id, auth.uid())
            )
          )
      )
    )
  $pol$;

  -- Trigger anti-cambio de event_id
  execute 'drop trigger if exists protect_guests_event_id on public.guests';
  execute 'create trigger protect_guests_event_id before update on public.guests for each row execute function public.tg_protect_guests_event_id()';

end $$;

-- ─────────────────────────────────────────────────────────────
-- EVENT_MEMBERS (opcional)
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.event_members') is null then
    return;
  end if;

  execute 'alter table public.event_members enable row level security';

  execute 'drop policy if exists event_members_select_own on public.event_members';

  -- suficiente para que "exists" funcione en policies: el usuario puede ver su propia membresía
  execute $pol$
    create policy event_members_select_own
    on public.event_members
    for select
    using (
      auth.role() = 'authenticated'
      and (user_id = auth.uid() or public.is_admin(auth.uid()))
    )
  $pol$;

  -- Inserciones/updates normalmente con service_role (tu API usa supabaseAdmin).
end $$;

-- ─────────────────────────────────────────────────────────────
-- INVITATIONS (solo para ver estado/logs; escritura la hace service_role)
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.invitations') is null then
    return;
  end if;

  execute 'alter table public.invitations enable row level security';

  execute 'drop policy if exists invitations_select on public.invitations';

  execute $pol$
    create policy invitations_select
    on public.invitations
    for select
    using (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.events e
        where e.id = invitations.event_id
          and (
            e.owner_id = auth.uid()
            or public.is_admin(auth.uid())
            or public.is_event_member(e.id, auth.uid())
          )
      )
    )
  $pol$;

  -- insert/update/delete: déjalo al service_role (bypassa RLS)
end $$;

-- ─────────────────────────────────────────────────────────────
-- EMAIL_LOGS (consulta por dueños/admin/miembros)
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.email_logs') is null then
    return;
  end if;

  execute 'alter table public.email_logs enable row level security';

  execute 'drop policy if exists email_logs_select on public.email_logs';

  execute $pol$
    create policy email_logs_select
    on public.email_logs
    for select
    using (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.invitations i
        join public.events e on e.id = i.event_id
        where i.id = email_logs.invitation_id
          and (
            e.owner_id = auth.uid()
            or public.is_admin(auth.uid())
            or public.is_event_member(e.id, auth.uid())
          )
      )
    )
  $pol$;

end $$;
