-- 1) Crear/asegurar bucket
insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do update set public = true;


-- 3) Policies (idempotentes)
do $$
begin
  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'event assets insert'
  ) then
    execute $pol$
      create policy "event assets insert"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'event-assets'
        and split_part(name,'/',1) = 'events'
        and exists (
          select 1
          from public.event_members em
          where em.user_id = auth.uid()
            and em.event_id::text = split_part(name,'/',2)
        )
      );
    $pol$;
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'event assets update'
  ) then
    execute $pol$
      create policy "event assets update"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'event-assets'
        and split_part(name,'/',1) = 'events'
        and exists (
          select 1
          from public.event_members em
          where em.user_id = auth.uid()
            and em.event_id::text = split_part(name,'/',2)
        )
      )
      with check (
        bucket_id = 'event-assets'
        and split_part(name,'/',1) = 'events'
        and exists (
          select 1
          from public.event_members em
          where em.user_id = auth.uid()
            and em.event_id::text = split_part(name,'/',2)
        )
      );
    $pol$;
  end if;

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'event assets delete'
  ) then
    execute $pol$
      create policy "event assets delete"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'event-assets'
        and split_part(name,'/',1) = 'events'
        and exists (
          select 1
          from public.event_members em
          where em.user_id = auth.uid()
            and em.event_id::text = split_part(name,'/',2)
        )
      );
    $pol$;
  end if;

end $$;
