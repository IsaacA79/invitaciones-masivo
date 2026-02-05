// src/routes/api/events/[eventId]/+server.js
import { json } from '@sveltejs/kit';
import { getEventJson, updateEventMinimal } from '$lib/server/repositories/events.repo.js';

const ALLOWED_ROLES = new Set(['admin', 'capturista', 'sender', 'designer']);
const LOGO_KEYS = ['logo', 'logo1', 'logo2', 'logo3', 'logo4', 'logo5'];

function clone(obj) {
  try { return structuredClone(obj); }
  catch { return JSON.parse(JSON.stringify(obj ?? {})); }
}

function isUuid(v) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function isPlainObject(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

/**
 * Defensa contra prototype pollution / keys peligrosas.
 * Elimina: __proto__, prototype, constructor en cualquier nivel.
 */
function stripDangerousKeys(input) {
  if (!isPlainObject(input) && !Array.isArray(input)) return input;

  if (Array.isArray(input)) {
    return input.map(stripDangerousKeys);
  }

  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === '__proto__' || k === 'prototype' || k === 'constructor') continue;
    out[k] = stripDangerousKeys(v);
  }
  return out;
}

export async function PATCH({ locals, params, request }) {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const role = locals.role ?? (await locals.getRole(user.id));
  if (!ALLOWED_ROLES.has(role)) return json({ error: 'Forbidden' }, { status: 403 });

  // sender no edita evento, solo envía
  if (role === 'sender') return json({ error: 'Forbidden' }, { status: 403 });

  const eventId = params.eventId;
  if (!isUuid(eventId)) return json({ error: 'Bad request' }, { status: 400 });

  // ✅ Corta payloads grandes ANTES de parsear (evita bombas)
  const raw = await request.text().catch(() => '');
  if (!raw) return json({ ok: true });

  // Ajusta este límite: 300k–800k recomendado si ya NO guardas base64
  if (raw.length > 800_000) return json({ error: 'Payload too large' }, { status: 413 });

  let patch;
  try {
    patch = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Limpia keys peligrosas (prototype pollution)
  patch = stripDangerousKeys(patch);

  const safe = {};

  // title: solo admin/capturista
  if (typeof patch.title === 'string' && (role === 'admin' || role === 'capturista')) {
    safe.title = patch.title.trim().slice(0, 200);
  }

  // event_json con control por rol (solo objetos planos)
  if (isPlainObject(patch.event_json)) {
    const incoming = stripDangerousKeys(clone(patch.event_json));

    // ✅ Admin: NO necesitamos leer el evento actual (evita SELECT extra)
    if (role === 'admin') {
      const size = JSON.stringify(incoming).length;
      if (size > 800_000) return json({ error: 'Payload too large' }, { status: 413 });
      safe.event_json = incoming;
    } else {
      // ✅ Solo aquí ocupamos el JSON actual (para merge)
      const current = await getEventJson({ supabase: locals.supabase, eventId });
      const currentJson = stripDangerousKeys(clone(current?.event_json ?? {}));

      let merged = clone(currentJson);

      if (role === 'capturista') {
        // capturista NO toca design
        delete incoming.design;
        merged = { ...merged, ...incoming, design: currentJson.design };
      } else if (role === 'designer') {
        // designer SOLO toca design + logos
        const next = clone(merged);
        if ('design' in incoming) next.design = incoming.design;

        for (const k of LOGO_KEYS) {
          if (k in incoming) next[k] = incoming[k];
        }
        merged = next;
      } else {
        return json({ error: 'Forbidden' }, { status: 403 });
      }

      const size = JSON.stringify(merged).length;
      if (size > 800_000) return json({ error: 'Payload too large' }, { status: 413 });

      safe.event_json = merged;
    }
  }

  // ✅ Si no hay nada que actualizar, no pegues a DB
  if (!Object.keys(safe).length) return json({ ok: true });

  // ✅ Update mínimo: NO regreses event_json completo
  await updateEventMinimal({
    supabase: locals.supabase,
    eventId,
    patch: safe
  });

  return json({ ok: true });
}
