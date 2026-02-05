// src/routes/(admin)/events/[eventId]/builder/+page.server.js
import { redirect, error } from '@sveltejs/kit';
import { getEvent } from '$lib/server/repositories/events.repo.js';
import { listGuests } from '$lib/server/repositories/guests.repo.js';

export async function load({ locals, params }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const eventId = String(params.eventId || '').trim();
  if (!eventId) throw error(400, 'Bad request');

  // RLS/membership debe permitir leer el evento
  const event = await getEvent({ supabase: locals.supabase, eventId });
  if (!event) throw error(404, 'Evento no encontrado');

  // ✅ Si está oculto => 404 aunque tengan el link
  if (event.hidden) throw error(404, 'Evento no encontrado');

  const guests = await listGuests({ supabase: locals.supabase, eventId });

  return { event, guests };
}

// POST accidental al builder
export const actions = {
  default: async ({ url }) => {
    throw redirect(303, url.pathname);
  }
};
