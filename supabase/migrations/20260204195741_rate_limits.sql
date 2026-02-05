-- public.rate_limits (ventana fija por key)
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz,
  count int not null default 0,
  updated_at timestamptz not null default now()
);

-- Si la tabla ya existía, asegura columnas (sin romper)
alter table public.rate_limits
  add column if not exists window_start timestamptz,
  add column if not exists count int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill por si window_start quedó null al agregarla
update public.rate_limits
set window_start = coalesce(window_start, now())
where window_start is null;

alter table public.rate_limits
  alter column window_start set not null;

create index if not exists rate_limits_updated_at_idx on public.rate_limits (updated_at);
create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

-- RLS ON y deny-by-default (service_role bypass RLS)
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Función: incrementa y te dice si todavía está permitido (ventana fija)
create or replace function public.rl_hit(p_key text, p_limit int, p_window_seconds int)
returns table(allowed boolean, count int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_bucket_start timestamptz;
  v_reset timestamptz;
begin
  if p_limit < 1 or p_limit > 100000 then raise exception 'Bad limit'; end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then raise exception 'Bad window'; end if;
  if p_key is null or length(p_key) < 3 or length(p_key) > 180 then raise exception 'Bad key'; end if;

  v_bucket_start :=
    to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  v_reset := v_bucket_start + make_interval(secs => p_window_seconds);

  insert into public.rate_limits as rl(key, window_start, count, updated_at)
  values (p_key, v_bucket_start, 1, v_now)
  on conflict (key) do update
    set window_start = case when rl.window_start = v_bucket_start then rl.window_start else v_bucket_start end,
        count = case when rl.window_start = v_bucket_start then least(rl.count + 1, p_limit + 1) else 1 end,
        updated_at = v_now
  returning (count <= p_limit) as allowed, count, v_reset
  into allowed, count, reset_at;

  return next;
end;
$$;

revoke all on function public.rl_hit(text,int,int) from public, anon, authenticated;
grant execute on function public.rl_hit(text,int,int) to service_role;
