alter table public.invitations
  add column if not exists send_status text not null default 'queued'
    check (send_status in ('queued','sent','failed'));

alter table public.invitations
  add column if not exists rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending','confirmed','declined'));

-- Backfill si antes usabas status para envío
update public.invitations
set send_status = status
where status in ('queued','sent','failed');

-- Backfill si ya hay registros con RSVP en status
update public.invitations
set rsvp_status = status
where status in ('confirmed','declined');

-- Si ya respondió, asumimos que se envió al menos una vez
update public.invitations
set send_status = 'sent'
where rsvp_status in ('confirmed','declined')
  and send_status = 'queued';
