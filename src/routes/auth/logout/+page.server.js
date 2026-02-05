import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export const load = async ({ locals, cookies }) => {
 // await locals.supabase.auth.signOut();
  for (const c of cookies.getAll()) {
    if (c.name.startsWith('sb-')) {
      cookies.delete(c.name, { path: '/' });
    }
  }

  // regresa al login
  throw redirect(308, '/login');
}