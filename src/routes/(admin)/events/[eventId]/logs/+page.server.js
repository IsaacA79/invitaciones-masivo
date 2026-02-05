// src/routes/(admin)/events/[eventId]/logs/+page.server.js
import { redirect, error } from '@sveltejs/kit';
import { getEvent } from '$lib/server/repositories/events.repo.js';
import { listLogsByEvent } from '$lib/server/repositories/emailLogs.repo.js';

export async function load({ locals, params }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const eventId = String(params.eventId || '').trim();
  if (!eventId) throw error(400, 'Bad request');

  // (admin)/+layout.server.js ya valida roles, pero igual nos aseguramos
  const role = locals.role ?? (await locals.getRole(user.id));
  locals.role = role;

  // Si RLS bloquea, getEvent puede tronar => 404 sin filtrar info
  let event = null;
  try {
    event = await getEvent({ supabase: locals.supabase, eventId });
  } catch {
    event = null;
  }

  // ✅ oculto o sin acceso => 404
  if (!event || event.hidden) throw error(404, 'Evento no encontrado');

  const logs = await listLogsByEvent({
    supabase: locals.supabase,
    eventId,
    limit: 250
  });

  return { event, logs };
}
