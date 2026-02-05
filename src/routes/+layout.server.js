// src/routes/+layout.server.js
export const load = async ({ locals, depends }) => {
  depends('supabase:auth');

  const { user } = await locals.safeGetSession();
  const role = user ? await locals.getRole(user.id) : null;

  return { user, role };
};
