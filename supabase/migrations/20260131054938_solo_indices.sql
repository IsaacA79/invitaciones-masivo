create index if not exists invitations_event_send_created_idx
  on public.invitations (event_id, send_status, created_at desc);

create index if not exists invitations_event_rsvp_responded_idx
  on public.invitations (event_id, rsvp_status, responded_at desc);

create index if not exists invitations_event_guest_idx
  on public.invitations (event_id, guest_id);
