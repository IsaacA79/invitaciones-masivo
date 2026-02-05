// src/routes/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  throw redirect(303, '/events');
};
