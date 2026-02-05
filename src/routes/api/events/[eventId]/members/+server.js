import { json } from '@sveltejs/kit';

const ROLES = new Set(['owner', 'capturista', 'designer', 'sender', 'viewer']);

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function requireSession(locals) {
  const { user } = await locals.safeGetSession();
  if (!user) return { error: json({ error: 'Unauthorized' }, { status: 401 }) };
  const role = locals.role ?? (await locals.getRole(user.id));
  return { user, role };
}

async function canManageEvent({ locals, eventId, userId, globalRole }) {
  if (globalRole === 'admin') return true;

  // owner del evento puede administrar
  const { data: ev } = await locals.supabase
    .from('events')
    .select('id, owner_id')
    .eq('id', eventId)
    .single();

  return !!ev && ev.owner_id === userId;
}

async function findUserIdByEmail(supabaseAdmin, email) {
  const admin = supabaseAdmin.auth?.admin;

  if (admin?.getUserByEmail) {
    const { data, error } = await admin.getUserByEmail(email);
    if (error) throw error;
    return data?.user?.id ?? null;
  }

  // fallback paginado
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;

    const u = data?.users?.find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
    if (u?.id) return u.id;

    if (!data?.users?.length) break;
    page++;
  }
  return null;
}

export async function GET({ locals, params }) {
  const { error, user, role } = await requireSession(locals);
  if (error) return error;

  const eventId = String(params.eventId || '');
  if (!isUuid(eventId)) return json({ error: 'eventId inválido' }, { status: 400 });

  const ok = await canManageEvent({ locals, eventId, userId: user.id, globalRole: role });
  if (!ok) return json({ error: 'Forbidden' }, { status: 403 });

  const { data, error: qErr } = await locals.supabaseAdmin
    .from('event_members')
    .select('user_id, role, created_at, profiles(email, role)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (qErr) return json({ error: qErr.message }, { status: 500 });
  return json({ members: data ?? [] });
}

export async function POST({ locals, params, request, url }) {
  const { error, user, role } = await requireSession(locals);
  if (error) return error;

  const eventId = String(params.eventId || '');
  if (!isUuid(eventId)) return json({ error: 'eventId inválido' }, { status: 400 });

  const ok = await canManageEvent({ locals, eventId, userId: user.id, globalRole: role });
  if (!ok) return json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const memberRole = String(body.role || '').trim();

  if (!email.includes('@')) return json({ error: 'Email inválido' }, { status: 400 });
  if (!ROLES.has(memberRole)) return json({ error: 'Rol inválido' }, { status: 400 });

  // 1) encontrar o invitar/crear usuario
  let userId = await findUserIdByEmail(locals.supabaseAdmin, email);

  if (!userId) {
    const { data, error: invErr } = await locals.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${url.origin}/login`,
      data: { role: memberRole }
    });
    if (invErr) return json({ error: invErr.message }, { status: 500 });
    userId = data?.user?.id ?? null;
  }

  if (!userId) return json({ error: 'No se pudo crear/ubicar el usuario' }, { status: 500 });

  // 2) upsert profile (role global)
  await locals.supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, email, role: memberRole }, { onConflict: 'id' });

  // 3) asignar al evento
  const { error: upErr } = await locals.supabaseAdmin
    .from('event_members')
    .upsert(
      { event_id: eventId, user_id: userId, role: memberRole },
      { onConflict: 'event_id,user_id' }
    );

  if (upErr) return json({ error: upErr.message }, { status: 500 });

  return json({ ok: true });
}

export async function PATCH({ locals, params, request }) {
  const { error, user, role } = await requireSession(locals);
  if (error) return error;

  const eventId = String(params.eventId || '');
  if (!isUuid(eventId)) return json({ error: 'eventId inválido' }, { status: 400 });

  const ok = await canManageEvent({ locals, eventId, userId: user.id, globalRole: role });
  if (!ok) return json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || '').trim();
  const memberRole = String(body.role || '').trim();

  if (!isUuid(userId)) return json({ error: 'userId inválido' }, { status: 400 });
  if (!ROLES.has(memberRole)) return json({ error: 'Rol inválido' }, { status: 400 });

  const { error: upErr } = await locals.supabaseAdmin
    .from('event_members')
    .update({ role: memberRole })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (upErr) return json({ error: upErr.message }, { status: 500 });
  return json({ ok: true });
}

export async function DELETE({ locals, params, request }) {
  const { error, user, role } = await requireSession(locals);
  if (error) return error;

  const eventId = String(params.eventId || '');
  if (!isUuid(eventId)) return json({ error: 'eventId inválido' }, { status: 400 });

  const ok = await canManageEvent({ locals, eventId, userId: user.id, globalRole: role });
  if (!ok) return json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || '').trim();
  if (!isUuid(userId)) return json({ error: 'userId inválido' }, { status: 400 });

  const { error: delErr } = await locals.supabaseAdmin
    .from('event_members')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (delErr) return json({ error: delErr.message }, { status: 500 });
  return json({ ok: true });
}
