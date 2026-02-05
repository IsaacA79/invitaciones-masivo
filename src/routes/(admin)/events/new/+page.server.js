// src/routes/(admin)/events/new/+page.server.js
import { redirect, fail } from '@sveltejs/kit';
import { createEvent } from '$lib/server/repositories/events.repo.js';
import { defaultEventJson } from '$lib/server/defaultEventJson.js';

export const actions = {
  default: async ({ locals, request }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Unauthorized' });

    const role = await locals.getRole(user.id);

    const fd = await request.formData();
    const title = String(fd.get('title') || 'Nuevo evento').trim().slice(0, 200);

    const ev = await createEvent({
      supabase: locals.supabase,
      userId: user.id,
      role,
      title,
      event_json: defaultEventJson
    });

    throw redirect(303, `/events/${ev.id}/builder`);
  }
};
