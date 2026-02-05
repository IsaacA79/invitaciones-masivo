// src/routes/api/events/[eventId]/guests/+server.js
import { json } from '@sveltejs/kit';
import { listGuests, replaceGuests } from '$lib/server/repositories/guests.repo.js';

const ALLOWED_ROLES = new Set(['admin', 'capturista', 'sender', 'designer']);

function isUuid(v) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

// Nota: ya NO generamos ids aquí; el repo guarda por (event_id,email)
function sanitizeGuest(g) {
  const obj = g && typeof g === 'object' ? g : {};
  return {
    name: String(obj.name ?? '').trim().slice(0, 120),
    email: String(obj.email ?? '').trim().toLowerCase().slice(0, 254),
    role: String(obj.role ?? '').trim().slice(0, 120),
    department: String(obj.department ?? '').trim().slice(0, 160)
  };
}

export async function GET({ locals, params }) {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const role = locals.role ?? (await locals.getRole(user.id));
  if (!ALLOWED_ROLES.has(role)) return json({ error: 'Forbidden' }, { status: 403 });

  const eventId = String(params.eventId || '').trim();
  if (!isUuid(eventId)) return json({ error: 'Bad request' }, { status: 400 });

  try {
    const guests = await listGuests({ supabase: locals.supabase, eventId });
    return json({ guests });
  } catch (e) {
    console.error('[GET /api/events/:eventId/guests]', e);
    return json(
      { error: e?.message || 'Error interno listando invitados' },
      { status: 500 }
    );
  }
}

export async function PUT({ locals, params, request }) {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const role = locals.role ?? (await locals.getRole(user.id));
  if (!ALLOWED_ROLES.has(role)) return json({ error: 'Forbidden' }, { status: 403 });

  // Solo admin/capturista pueden editar lista
  if (role !== 'admin' && role !== 'capturista') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const eventId = String(params.eventId || '').trim();
  if (!isUuid(eventId)) return json({ error: 'Bad request' }, { status: 400 });

  try {
    // ✅ corta payloads enormes ANTES de parsear (evita bombas)
    const raw = await request.text().catch(() => '');
    if (raw.length > 600_000) return json({ error: 'Payload too large' }, { status: 413 });

    const body = raw ? JSON.parse(raw) : {};
    const list = Array.isArray(body.guests) ? body.guests : [];

    // límites para evitar abusos (antes de procesar)
    if (list.length > 5000) return json({ error: 'Too many guests' }, { status: 413 });

    const guests = list.map(sanitizeGuest);

    // ✅ REPLACE: borra los que ya no vienen + evita persistir correos “en partes”
    const result = await replaceGuests({
      supabase: locals.supabase,
      eventId,
      guests
    });

    // devuelve lista actual (opcional, UI lo agradece)
    const current = await listGuests({ supabase: locals.supabase, eventId });

    return json({
      ok: true,
      ...result,
      guests: current
    });
  } catch (e) {
    console.error('[PUT /api/events/:eventId/guests]', e);
    return json(
      { error: e?.message || 'Error interno guardando invitados' },
      { status: 500 }
    );
  }
}
