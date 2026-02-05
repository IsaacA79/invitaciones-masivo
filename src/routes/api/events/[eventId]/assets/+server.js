import { json } from '@sveltejs/kit';

const BUCKET = 'event-assets';

const ALLOWED_ROLES = new Set(['admin', 'capturista', 'designer']); // sender NO
const SLOT_KEYS = new Set(['bgImage', 'logo', 'logo1', 'logo2', 'logo3', 'logo4', 'logo5']);

const MAX_BYTES = 2 * 1024 * 1024;
const MIME_TO_EXT = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp']
]);

function isUuid(v) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function extractPathFromUrlOrPath(v) {
  if (!v || typeof v !== 'string') return '';
  // si ya guardas path "events/.."
  if (v.startsWith('events/')) return v;

  // si guardas publicUrl: .../storage/v1/object/public/event-assets/<path>
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = v.indexOf(marker);
  if (idx >= 0) return v.slice(idx + marker.length);

  return '';
}

function canTouchSlot(role, slot) {
  // bgImage: solo admin/designer
  if (slot === 'bgImage') return role === 'admin' || role === 'designer';

  // logos: admin/capturista/designer
  return role === 'admin' || role === 'capturista' || role === 'designer';
}

/**
 * Acceso sin depender de RLS (usa service_role si existe).
 * Reglas:
 * - admin: ok
 * - capturista: solo si es owner_id
 * - designer: debe estar en event_members
 */
async function assertAccess({ locals, userId, role, eventId }) {
  const admin = locals.supabaseAdmin;

  // Si NO hay supabaseAdmin, fallback a RLS (si tu policy lo permite)
  if (!admin) {
    const { data: ev, error } = await locals.supabase
      .from('events')
      .select('id, owner_id, hidden')
      .eq('id', eventId)
      .single();

    if (error || !ev) return { ok: false, code: 404 };
    if (ev.hidden) return { ok: false, code: 404 };

    if (role === 'capturista' && ev.owner_id !== userId) return { ok: false, code: 403 };
    return { ok: true, ev };
  }

  const { data: ev, error: evErr } = await admin
    .from('events')
    .select('id, owner_id, hidden, event_json')
    .eq('id', eventId)
    .single();

  if (evErr || !ev) return { ok: false, code: 404 };
  if (ev.hidden) return { ok: false, code: 404 };

  if (role === 'admin') return { ok: true, ev };

  if (role === 'capturista') {
    if (ev.owner_id !== userId) return { ok: false, code: 403 };
    return { ok: true, ev };
  }

  if (role === 'designer') {
    const { data: mem, error: memErr } = await admin
      .from('event_members')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memErr || !mem) return { ok: false, code: 403 };
    return { ok: true, ev };
  }

  return { ok: false, code: 403 };
}

export async function POST({ locals, params, request }) {
  try {
    const { user } = await locals.safeGetSession();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const role = locals.role ?? (await locals.getRole(user.id));
    locals.role = role;

    if (!ALLOWED_ROLES.has(role)) return json({ error: 'Forbidden' }, { status: 403 });

    const eventId = String(params.eventId || '').trim();
    if (!isUuid(eventId)) return json({ error: 'Bad request' }, { status: 400 });

    const form = await request.formData().catch(() => null);
    if (!form) return json({ error: 'Bad request' }, { status: 400 });

    const slot = String(form.get('slot') || '').trim();
    const file = form.get('file');

    if (!SLOT_KEYS.has(slot)) return json({ error: 'Slot inválido' }, { status: 400 });
    if (!canTouchSlot(role, slot)) return json({ error: 'Forbidden' }, { status: 403 });

    if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
      return json({ error: 'Archivo requerido' }, { status: 400 });
    }

    const mime = String(file.type || '');
    const ext = MIME_TO_EXT.get(mime);
    if (!ext) return json({ error: 'Tipo no permitido (PNG/JPG/WEBP)' }, { status: 415 });

    const size = Number(file.size || 0);
    if (!size || size > MAX_BYTES) return json({ error: 'Archivo demasiado grande' }, { status: 413 });

    // ✅ permiso + traemos event_json para limpiar prev (si aplica)
    const access = await assertAccess({ locals, userId: user.id, role, eventId });
    if (!access.ok) return json({ error: access.code === 404 ? 'Evento no encontrado' : 'Forbidden' }, { status: access.code });

    const ev = access.ev || {};
    const currentJson = ev.event_json || {};

    // Path que CUMPLE tu policy: split_part(name,'/',1)='events' y (2)=eventId
    const path = `events/${eventId}/${slot}.${ext}`;

    // borrar anterior si existía y es otro path (evita basura de extensiones)
    const prev =
      slot === 'bgImage'
        ? extractPathFromUrlOrPath(currentJson?.design?.bgImage)
        : extractPathFromUrlOrPath(currentJson?.[slot]);

    const storage = (locals.supabaseAdmin ?? locals.supabase).storage.from(BUCKET);

    if (prev && prev !== path && prev.startsWith(`events/${eventId}/`)) {
      await storage.remove([prev]).catch(() => {});
    }

    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await storage.upload(path, buf, {
      upsert: true,
      contentType: mime,
      cacheControl: '3600'
    });

    if (upErr) {
      console.error('[assets] upload error', upErr);
      // si fue RLS, normalmente llega como 403 desde storage
      return json({ error: upErr.message || 'No se pudo subir' }, { status: 403 });
    }

    const { data: pub } = storage.getPublicUrl(path);
    return json({ ok: true, path, url: pub?.publicUrl || '' });
  } catch (e) {
    console.error('[POST /api/events/:eventId/assets]', e);
    return json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

export async function DELETE({ locals, params, request }) {
  try {
    const { user } = await locals.safeGetSession();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const role = locals.role ?? (await locals.getRole(user.id));
    locals.role = role;

    if (!ALLOWED_ROLES.has(role)) return json({ error: 'Forbidden' }, { status: 403 });

    const eventId = String(params.eventId || '').trim();
    if (!isUuid(eventId)) return json({ error: 'Bad request' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const slot = String(body.slot || '').trim();

    if (!SLOT_KEYS.has(slot)) return json({ error: 'Slot inválido' }, { status: 400 });
    if (!canTouchSlot(role, slot)) return json({ error: 'Forbidden' }, { status: 403 });

    const access = await assertAccess({ locals, userId: user.id, role, eventId });
    if (!access.ok) return json({ error: access.code === 404 ? 'Evento no encontrado' : 'Forbidden' }, { status: access.code });

    const ev = access.ev || {};
    const currentJson = ev.event_json || {};

    const prev =
      slot === 'bgImage'
        ? extractPathFromUrlOrPath(currentJson?.design?.bgImage)
        : extractPathFromUrlOrPath(currentJson?.[slot]);

    if (!prev || !prev.startsWith(`events/${eventId}/`)) return json({ ok: true });

    const storage = (locals.supabaseAdmin ?? locals.supabase).storage.from(BUCKET);
    await storage.remove([prev]).catch(() => {});

    return json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/events/:eventId/assets]', e);
    return json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
