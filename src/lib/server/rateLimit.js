
// src/lib/server/rateLimit.js

export function secondsUntil(iso) {
  try {
    return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function normalizeKey(key) {
  const k = String(key ?? '').trim();
  // defensas: evita keys gigantes o con chars raros
  // (no es seguridad absoluta, pero ayuda a no ensuciar tabla)
  const safe = k.replace(/[^\w:.-]/g, '').slice(0, 180);
  return safe;
}

/**
 * Rate limit vía RPC (requiere supabaseAdmin/service_role)
 * Retorna:
 * - allowed: boolean
 * - count: number
 * - resetAt: ISO string | null
 * - reason?: string (si algo impide aplicar RL)
 */
export async function rateLimit({ supabaseAdmin, key, limit, windowSeconds }) {
  const safeKey = normalizeKey(key);

  // si no hay admin client, NO bloqueamos (pero lo reportamos)
  if (!supabaseAdmin) {
    return { allowed: true, count: 0, resetAt: null, reason: 'no-admin-client' };
  }

  // defensas de parámetros (no deberían pasar, pero mejor)
  const lim = Number(limit);
  const win = Number(windowSeconds);
  if (!safeKey || safeKey.length < 3) {
    return { allowed: true, count: 0, resetAt: null, reason: 'bad-key' };
  }
  if (!Number.isFinite(lim) || lim < 1 || lim > 100000) {
    return { allowed: true, count: 0, resetAt: null, reason: 'bad-limit' };
  }
  if (!Number.isFinite(win) || win < 1 || win > 86400) {
    return { allowed: true, count: 0, resetAt: null, reason: 'bad-window' };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('rl_hit', {
      p_key: safeKey,
      p_limit: lim,
      p_window_seconds: win
    });

    if (error) {
      // si aún no migras / RPC no existe / etc.
      return { allowed: true, count: 0, resetAt: null, reason: `rpc-error:${error.code || 'unknown'}` };
    }

    // returns table => normalmente array
    const row = Array.isArray(data) ? data[0] : data;

    return {
      allowed: !!row?.allowed,
      count: Number(row?.count ?? 0),
      resetAt: row?.reset_at ?? null
    };
  } catch (e) {
    // no rompas el endpoint por RL: deja pasar y registra reason
    return { allowed: true, count: 0, resetAt: null, reason: 'rpc-exception' };
  }
}
