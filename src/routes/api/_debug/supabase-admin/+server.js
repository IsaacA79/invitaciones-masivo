import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { DEBUG_ADMIN_TOKEN } from '$env/static/private';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.server.js'; // o .server.js según tu archivo

export const GET = async ({ url }) => {
  // ✅ solo en dev + token
  const token = url.searchParams.get('token');

  if (!dev || token !== DEBUG_ADMIN_TOKEN) {
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .select('id')
    .limit(1);

  return json({ ok: true, data, error });
};
