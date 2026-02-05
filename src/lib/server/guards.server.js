import { error } from '@sveltejs/kit';

export async function requireRole(event, roles) {
  const { user } = await event.locals.safeGetSession();
  if (!user) throw error(401, 'No autenticado');

  const role = await event.locals.getRole(user.id);
  if (!roles.includes(role)) throw error(403, 'Sin permisos');

  return { user, role };
}

export async function rateLimitOrThrow(event, { name, key, limit, windowSeconds }) {
  const rlKey = `${name}:${key}`;
  const { data, error: e } = await event.locals.supabaseAdmin.rpc('check_rate_limit', {
    p_key: rlKey,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (e) throw error(500, 'Rate limit RPC falló');
  if (!data) throw error(429, 'Demasiadas solicitudes');
}
