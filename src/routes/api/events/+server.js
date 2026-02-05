
// src/routes/api/events/+server.js
import { json } from '@sveltejs/kit';
import { createEvent, listEvents } from '$lib/server/repositories/events.repo.js';
import { defaultEventJson } from '$lib/server/defaultEventJson.js';

export async function GET({ locals }) {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  // RLS: admin -> todos, capturista -> propios
  const events = await listEvents(locals.supabase);

  return json({ events });
}

export async function POST({ locals, request }) {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const role = await locals.getRole(user.id);

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || 'Nuevo evento').trim();

  const ev = await createEvent({
    supabase: locals.supabase,
    userId: user.id,
    role,
    title,
    event_json: defaultEventJson
  });

  return json({ event: ev }, { status: 201 });
}
