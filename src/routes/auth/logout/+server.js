// src/routes/auth/logout/+server.js
import { redirect } from '@sveltejs/kit';

export async function POST({ locals }) {
  // cierra sesión y borra cookies de auth (SSR)
  await locals.supabase.auth.signOut();

  // regresa al login
  throw redirect(303, '/login');
}
