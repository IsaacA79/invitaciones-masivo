drop policy if exists events_update on public.events;

create policy events_update
on public.events
for update
using (
  -- admin global
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  -- owner directo
  or auth.uid() = owner_id
  -- miembros owner/editor
  or exists (
    select 1 from public.event_members m
    where m.event_id = events.id
      and m.user_id = auth.uid()
      and m.role in ('owner','editor')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or auth.uid() = owner_id
  or exists (
    select 1 from public.event_members m
    where m.event_id = events.id
      and m.user_id = auth.uid()
      and m.role in ('owner','editor')
  )
);
