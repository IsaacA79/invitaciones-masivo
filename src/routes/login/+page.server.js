// src/routes/login/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const load = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (user) throw redirect(303, '/events');
};

export const actions = {
  default: async ({ request, locals }) => {
    const fd = await request.formData();
    const parsed = schema.safeParse({
      email: String(fd.get('email') ?? '').trim(),
      password: String(fd.get('password') ?? '')
    });

    if (!parsed.success) return fail(400, { message: 'Credenciales inválidas.' });

    const { error } = await locals.supabase.auth.signInWithPassword(parsed.data);
    if (error) return fail(400, { message: error.message });

    throw redirect(303, '/events');
  }
};
