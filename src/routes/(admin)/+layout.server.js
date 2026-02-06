// src/routes/(admin)/+layout.server.js
import { redirect, error } from "@sveltejs/kit";

const ALLOWED_ROLES = new Set(["admin", "capturista", "sender", "designer"]);

export const load = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, "/login");

  locals.user = user;

  const role = locals.role ?? (await locals.getRole(user.id));
  locals.role = role;

  if (!ALLOWED_ROLES.has(role)) throw error(403, "Sin permisos");

  // ✅ importante: el layout.svelte lee data.user
  return { role, user };
};
