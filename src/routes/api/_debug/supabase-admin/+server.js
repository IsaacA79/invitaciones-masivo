// src/routes/api/_debug/supabase-admin/+server.js
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.server.js';

export const GET = async ({ request }) => {
  if (!dev) return new Response('Not found', { status: 404 });

  const DEBUG_ADMIN_TOKEN = env.DEBUG_ADMIN_TOKEN;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!DEBUG_ADMIN_TOKEN || token !== DEBUG_ADMIN_TOKEN) {
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.from('email_logs').select('id').limit(1);
  if (error) return json({ ok: false, error }, { status: 500 });

  return json({ ok: true, data });
};
