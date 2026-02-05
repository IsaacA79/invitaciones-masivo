// src/routes/logout/+server.js

import { redirect } from '@sveltejs/kit';

export const POST = async ({ locals, cookies }) => {
  // Global = termina TODAS las sesiones activas del usuario (todas las devices)
  await locals.supabase.auth.signOut({ scope: 'global' });

  // Limpieza extra de cookies (por si queda algo)
  for (const c of cookies.getAll()) {
    if (c.name.startsWith('sb-')) {
      cookies.delete(c.name, { path: '/' });
    }
  }

  throw redirect(308, '/login');
};
