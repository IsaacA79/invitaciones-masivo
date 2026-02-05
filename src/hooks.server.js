// src/hooks.server.js
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';

function getIP(event) {
  return (
    event.request.headers.get('cf-connecting-ip') ??
    event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    event.getClientAddress()
  );
}

export async function handle({ event, resolve }) {
  event.locals.ip = getIP(event);

  // SSR client con cookies (sesión)
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' });
        });
      }
    }
  });

  // ✅ Admin client (service role) si existe key; si no, lo dejamos null (evita “anon” sin querer)
  const hasServiceKey =
    typeof SUPABASE_SERVICE_ROLE_KEY === 'string' && SUPABASE_SERVICE_ROLE_KEY.trim().length > 30;

  event.locals.supabaseAdmin = hasServiceKey
    ? createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

  // ✅ Sesión “segura”
  event.locals.safeGetSession = async () => {
    try {
      const {
        data: { user },
        error
      } = await event.locals.supabase.auth.getUser();

      if (error || !user) return { session: null, user: null };
      return { session: null, user };
    } catch {
      return { session: null, user: null };
    }
  };

  // Role helper
  event.locals.getRole = async (userId) => {
    if (!userId) return 'viewer';
    const { data } = await event.locals.supabase.from('profiles').select('role').eq('id', userId).single();
    return data?.role ?? 'viewer';
  };

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}
