-- Fix/migración compatible: tabla existente (window_start) + agregar reset_at

-- 1) Agregar columnas que falten
alter table public.rate_limits
  add column if not exists reset_at timestamptz;

-- Si tu tabla vieja NO tenía updated_at o count, asegúralas también
alter table public.rate_limits
  add column if not exists updated_at timestamptz not null default now();

alter table public.rate_limits
  add column if not exists count int not null default 0;

-- 2) Backfill de reset_at si venías del esquema viejo con window_start
--    (asumimos ventana default 60s SOLO para backfill; rl_hit siempre calcula el correcto)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='rate_limits' and column_name='window_start'
  ) then
    update public.rate_limits
      set reset_at = coalesce(reset_at, window_start + interval '60 seconds')
    where reset_at is null;
  else
    -- si no existe window_start, al menos pon reset_at en "now + 60s" para no dejar null
    update public.rate_limits
      set reset_at = coalesce(reset_at, now() + interval '60 seconds')
    where reset_at is null;
  end if;
end $$;

-- 3) Índice para reset_at (tu migración fallaba aquí)
create index if not exists rate_limits_reset_at_idx
  on public.rate_limits (reset_at);

-- (Opcional) índice adicional útil para limpieza por updated_at
create index if not exists rate_limits_updated_at_idx
  on public.rate_limits (updated_at);

-- 4) Seguridad: RLS ON + deny by default para anon/authenticated
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- 5) Asegura función rl_hit (si ya la tienes, esto la reemplaza sin romper)
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
  if p_limit < 1 or p_limit > 100000 then
    raise exception 'Bad limit';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Bad window';
  end if;

  if p_key is null or length(p_key) < 3 or length(p_key) > 180 then
    raise exception 'Bad key';
  end if;

  v_bucket_start :=
    to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  v_reset := v_bucket_start + make_interval(secs => p_window_seconds);

  insert into public.rate_limits as rl(key, window_start, count, updated_at, reset_at)
  values (p_key, v_bucket_start, 1, v_now, v_reset)
  on conflict (key) do update
    set window_start = case
        when rl.window_start = v_bucket_start then rl.window_start
        else v_bucket_start
      end,
      count = case
        when rl.window_start = v_bucket_start then least(rl.count + 1, p_limit + 1)
        else 1
      end,
      updated_at = v_now,
      reset_at = v_reset
  returning (count <= p_limit) as allowed, count, v_reset
  into allowed, count, reset_at;

  return next;
end;
$$;

revoke all on function public.rl_hit(text,int,int) from public, anon, authenticated;
grant execute on function public.rl_hit(text,int,int) to service_role;
