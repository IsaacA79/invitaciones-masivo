-- Ajuste RLS: event_members.role = owner|editor|viewer

-- ─────────────────────────────────────────────
-- Helper: si el usuario es miembro con rol
-- ─────────────────────────────────────────────
create or replace function public.event_member_has_role(_event_id uuid, _uid uuid, _roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.event_members em
    where em.event_id = _event_id
      and em.user_id = _uid
      and em.role = any(_roles)
  );
$$;

-- ─────────────────────────────────────────────
-- EVENTS: update solo owner/editor del evento (o owner_id/admin global)
-- ─────────────────────────────────────────────
do $$
begin
  if to_regclass('public.events') is null then return; end if;

  execute 'alter table public.events enable row level security';

  execute 'drop policy if exists events_update on public.events';

  execute $pol$
    create policy events_update
    on public.events
    for update
    using (
      auth.role() = 'authenticated'
      and (
        owner_id = auth.uid()
        or public.is_admin(auth.uid())
        or public.event_member_has_role(id, auth.uid(), array['owner','editor'])
      )
    )
    with check (
      auth.role() = 'authenticated'
      and (
        owner_id = auth.uid()
        or public.is_admin(auth.uid())
        or public.event_member_has_role(id, auth.uid(), array['owner','editor'])
      )
    )
  $pol$;
end $$;

-- ─────────────────────────────────────────────
-- GUESTS: escribir solo owner/editor del evento (o owner_id/admin global)
-- ─────────────────────────────────────────────
do $$
begin
  if to_regclass('public.guests') is null then return; end if;

  execute 'alter table public.guests enable row level security';

  execute 'drop policy if exists guests_insert on public.guests';
  execute 'drop policy if exists guests_update on public.guests';
  execute 'drop policy if exists guests_delete on public.guests';

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
            or public.event_member_has_role(e.id, auth.uid(), array['owner','editor'])
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
            or public.event_member_has_role(e.id, auth.uid(), array['owner','editor'])
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
            or public.event_member_has_role(e.id, auth.uid(), array['owner','editor'])
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
            or public.event_member_has_role(e.id, auth.uid(), array['owner','editor'])
          )
      )
    )
  $pol$;

end $$;

-- ─────────────────────────────────────────────
-- EVENT_MEMBERS: lectura mínima (propia fila o admin)
-- (suficiente para que helpers funcionen sin filtrar de más)
-- ─────────────────────────────────────────────
do $$
begin
  if to_regclass('public.event_members') is null then return; end if;

  execute 'alter table public.event_members enable row level security';

  execute 'drop policy if exists event_members_select_own on public.event_members';

  execute $pol$
    create policy event_members_select_own
    on public.event_members
    for select
    using (
      auth.role() = 'authenticated'
      and (user_id = auth.uid() or public.is_admin(auth.uid()))
    )
  $pol$;

  -- Escritura de members: recomendado SOLO vía service_role (tu API ya lo hace).
end $$;
