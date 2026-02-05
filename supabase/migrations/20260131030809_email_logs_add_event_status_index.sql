create index if not exists email_logs_event_status_created_idx
  on public.email_logs (event_id, status, created_at desc);
