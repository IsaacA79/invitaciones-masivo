// src/routes/api/events/[eventId]/hide/+server.js
import { json } from '@sveltejs/kit';
import { updateEventMinimal } from '$lib/server/repositories/events.repo.js';

const ALLOWED_ROLES = new Set(['admin', 'capturista']);

function isUuid(v) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function safeMsg(err) {
  return err?.message || err?.error_description || String(err || '');
}

async function assertAccess({ supabase, eventId }) {
  // RLS manda aquí
  const { data, error } = await supabase
    .from('events')
    .select('id, owner_id, hidden')
    .eq('id', eventId)
    .single();

  return { ev: data ?? null, err: error ?? null };
}

async function canMutate({ role, userId, ev }) {
  if (!ev) return false;
  if (role === 'admin') return true;
  // capturista: solo su evento (según tu regla actual)
  return role === 'capturista' && ev.owner_id === userId;
}

async function tryUpdate({ supabase, eventId, patch }) {
  // usa tu repo (select mínimo), pero sin reventar 500
  try {
    await updateEventMinimal({ supabase, eventId, patch });
    return { ok: true, err: null };
  } catch (e) {
    return { ok: false, err: e };
  }
}

// POST => ocultar
export async function POST({ locals, params }) {
  const started = Date.now();

  try {
    const { user } = await locals.safeGetSession();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const role = locals.role ?? (await locals.getRole(user.id));
    locals.role = role;

    if (!ALLOWED_ROLES.has(role)) return json({ error: 'Forbidden' }, { status: 403 });

    const eventId = String(params.eventId || '').trim();
    if (!isUuid(eventId)) return json({ error: 'Bad request' }, { status: 400 });

    // 1) validar acceso / estado actual (RLS)
    const { ev, err: evErr } = await assertAccess({ supabase: locals.supabase, eventId });
    if (evErr || !ev) return json({ error: 'Evento no encontrado o sin acceso' }, { status: 404 });

    if (!(await canMutate({ role, userId: user.id, ev }))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ev.hidden) return json({ ok: true, hidden: true });

    const patch = {
      hidden: true,
      hidden_at: new Date().toISOString(),
      hidden_by: user.id
    };

    // 2) intento con sesión (mejor para triggers que usan auth.uid())
    const a = await tryUpdate({ supabase: locals.supabase, eventId, patch });
    if (a.ok) return json({ ok: true, hidden: true });

    // 3) fallback con service role (si existe)
    const admin = locals.supabaseAdmin ?? null;
    if (!admin) {
      console.error('[POST hide] update failed (session) and no supabaseAdmin', {
        eventId,
        role,
        ms: Date.now() - started,
        err: safeMsg(a.err)
      });

      return json(
        { error: `No se pudo ocultar (RLS/trigger) y supabaseAdmin no está configurado: ${safeMsg(a.err)}` },
        { status: 403 }
      );
    }

    const b = await tryUpdate({ supabase: admin, eventId, patch });
    if (!b.ok) {
      console.error('[POST hide] update failed (admin fallback)', {
        eventId,
        role,
        ms: Date.now() - started,
        err: safeMsg(b.err)
      });

      return json({ error: safeMsg(b.err) || 'No se pudo ocultar' }, { status: 400 });
    }

    return json({ ok: true, hidden: true });
  } catch (e) {
    console.error('[POST /api/events/:eventId/hide] fatal', e);
    return json({ error: safeMsg(e) || 'Error interno' }, { status: 500 });
  }
}

// DELETE => mostrar de nuevo (opcional)
export async function DELETE({ locals, params }) {
  const started = Date.now();

  try {
    const { user } = await locals.safeGetSession();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const role = locals.role ?? (await locals.getRole(user.id));
    locals.role = role;

    if (!ALLOWED_ROLES.has(role)) return json({ error: 'Forbidden' }, { status: 403 });

    const eventId = String(params.eventId || '').trim();
    if (!isUuid(eventId)) return json({ error: 'Bad request' }, { status: 400 });

    const { ev, err: evErr } = await assertAccess({ supabase: locals.supabase, eventId });
    if (evErr || !ev) return json({ error: 'Evento no encontrado o sin acceso' }, { status: 404 });

    if (!(await canMutate({ role, userId: user.id, ev }))) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!ev.hidden) return json({ ok: true, hidden: false });

    const patch = {
      hidden: false,
      hidden_at: null,
      hidden_by: null
    };

    // 1) intento con sesión
    const a = await tryUpdate({ supabase: locals.supabase, eventId, patch });
    if (a.ok) return json({ ok: true, hidden: false });

    // 2) fallback service-role
    const admin = locals.supabaseAdmin ?? null;
    if (!admin) {
      console.error('[DELETE hide] update failed (session) and no supabaseAdmin', {
        eventId,
        role,
        ms: Date.now() - started,
        err: safeMsg(a.err)
      });

      return json(
        { error: `No se pudo mostrar (RLS/trigger) y supabaseAdmin no está configurado: ${safeMsg(a.err)}` },
        { status: 403 }
      );
    }

    const b = await tryUpdate({ supabase: admin, eventId, patch });
    if (!b.ok) {
      console.error('[DELETE hide] update failed (admin fallback)', {
        eventId,
        role,
        ms: Date.now() - started,
        err: safeMsg(b.err)
      });

      return json({ error: safeMsg(b.err) || 'No se pudo mostrar' }, { status: 400 });
    }

    return json({ ok: true, hidden: false });
  } catch (e) {
    console.error('[DELETE /api/events/:eventId/hide] fatal', e);
    return json({ error: safeMsg(e) || 'Error interno' }, { status: 500 });
  }
}
