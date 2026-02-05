// src/lib/server/repositories/guests.repo.js

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function cleanStr(v, max = 200) {
  return String(v ?? '').trim().slice(0, max);
}

function normalizeEmail(v) {
  return cleanStr(v, 254).toLowerCase();
}

function isValidEmail(email) {
  return !!email && EMAIL_RE.test(email);
}

function normalizeGuests(eventId, guests) {
  const rows = (guests ?? [])
    .map((g) => {
      const email = normalizeEmail(g?.email);

      const row = {
        event_id: eventId,
        name: cleanStr(g?.name, 120),
        email
      };

      const role = cleanStr(g?.role ?? g?.cargo, 120);
      const department = cleanStr(g?.department ?? g?.dependencia, 160);

      // ✅ solo setea si viene valor (mantiene tu semántica)
      if (role) row.role = role;
      if (department) row.department = department;

      return row;
    })
    // ✅ CLAVE: NO persistas correos “en partes”
    .filter((r) => isValidEmail(r.email));

  // ✅ dedupe por email (evita repetidos)
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (seen.has(r.email)) continue;
    seen.add(r.email);
    out.push(r);
  }

  return out;
}

async function assertEventAccess(supabase, eventId) {
  if (!supabase?.from) throw new Error('supabase client requerido en guests.repo.js');

  // ✅ aplica RLS (si no hay acceso, no regresa)
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .single();

  if (error || !data) return false;
  return true;
}

function chunk(arr, size = 500) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function listGuests({ supabase, eventId }) {
  const ok = await assertEventAccess(supabase, eventId);
  if (!ok) return [];

  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * UPSERT “no destructivo”
 * Útil cuando NO quieres borrar los que ya existen.
 */
export async function upsertGuests({ supabase, eventId, guests }) {
  const ok = await assertEventAccess(supabase, eventId);
  if (!ok) {
    const err = new Error('Evento no encontrado o sin acceso');
    err.status = 404;
    throw err;
  }

  const rows = normalizeGuests(eventId, guests);
  if (!rows.length) return [];

  const { data, error } = await supabase
    .from('guests')
    .upsert(rows, { onConflict: 'event_id,email' })
    .select('*');

  if (error) throw error;
  return data ?? [];
}

/**
 * ✅ REPLACE “destructivo controlado”
 * - Upsert de los que vienen
 * - Borra los que YA estaban pero ya no vienen
 * - Y elimina basura previa (emails inválidos) porque nunca estarán en keepEmails
 *
 * Ideal para tu autosave del builder (PUT).
 */
export async function replaceGuests({ supabase, eventId, guests }) {
  const ok = await assertEventAccess(supabase, eventId);
  if (!ok) {
    const err = new Error('Evento no encontrado o sin acceso');
    err.status = 404;
    throw err;
  }

  const rows = normalizeGuests(eventId, guests);

  // trae existentes (solo emails)
  const { data: existing, error: exErr } = await supabase
    .from('guests')
    .select('email')
    .eq('event_id', eventId);

  if (exErr) throw exErr;

  const keep = new Set(rows.map((r) => r.email));
  const toDelete = (existing ?? [])
    .map((r) => normalizeEmail(r?.email))
    .filter((e) => e && !keep.has(e));

  // 1) borrar los que ya no van (y también limpia fragmentos viejos)
  for (const part of chunk(toDelete, 300)) {
    const { error: delErr } = await supabase
      .from('guests')
      .delete()
      .eq('event_id', eventId)
      .in('email', part);

    if (delErr) throw delErr;
  }

  // 2) upsert de los vigentes
  if (rows.length) {
    // batch por si tienes muchos
    for (const part of chunk(rows, 500)) {
      const { error: upErr } = await supabase
        .from('guests')
        .upsert(part, { onConflict: 'event_id,email' });

      if (upErr) throw upErr;
    }
  }

  return { ok: true, kept: rows.length, deleted: toDelete.length };
}
