// import { json } from '@sveltejs/kit';

// export async function POST({ locals, params, request }) {
//   const { user } = await locals.safeGetSession();
//   if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

//   const role = locals.role ?? (await locals.getRole(user.id));
//   if (role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

//   const body = await request.json().catch(() => ({}));
//   const approved = !!body.approved;

//   const { data, error } = await locals.supabase
//     .from('events')
//     .update({ approved })
//     .eq('id', params.eventId)
//     .select('id, approved')
//     .single();

//   if (error) return json({ error: error.message }, { status: 400 });
//   return json({ ok: true, event: data });
// }


import { json } from '@sveltejs/kit';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST({ locals, params }) {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const role = locals.role ?? (await locals.getRole(user.id));
  if (role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });

  const eventId = String(params.eventId || '').trim();
  if (!eventId || !UUID_RE.test(eventId)) return json({ error: 'eventId inválido' }, { status: 400 });

  const { data, error } = await locals.supabase
    .from('events')
    .update({ approved: true })
    .eq('id', eventId)
    .select('id, approved')
    .single();

  if (error) return json({ error: error.message }, { status: 400 });

  return json({ ok: true, event: data });
}
