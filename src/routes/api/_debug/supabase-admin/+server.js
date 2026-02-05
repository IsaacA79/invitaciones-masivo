// src/routes/api/_debug/supabase-admin/+server.js
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.server.js';

export const GET = async ({ request }) => {
  // En producción mejor ni mostrar que existe
  if (!dev) {
    return new Response('Not found', { status: 404 });
  }

  const DEBUG_ADMIN_TOKEN = env.DEBUG_ADMIN_TOKEN;
  if (!DEBUG_ADMIN_TOKEN) {
    return json({ ok: false, error: 'Falta DEBUG_ADMIN_TOKEN en variables de entorno' }, { status: 500 });
  }

  // Mejor por header para que no se loguee fácil en URLs
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (token !== DEBUG_ADMIN_TOKEN) {
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .select('id')
    .limit(1);

  if (error) {
    return json({ ok: false, error }, { status: 500 });
  }

  return json({ ok: true, data });
};
