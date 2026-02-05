// src/routes/(admin)/events/+page.server.js
import { listEvents } from '$lib/server/repositories/events.repo.js';

export async function load({ locals }) {
  const { user } = await locals.safeGetSession();
  if (!user) return { events: [] };

  // RLS hace el filtro:
  // - admin: todos
  // - capturista: solo owner_id = user.id
  const events = await listEvents(locals.supabase);

  return { events };
}
