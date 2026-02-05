// src/lib/server/repositories/events.repo.js

function sanitizePatch(patch = {}) {
  const clean = { ...patch };
  delete clean.id;
  delete clean.owner_id;
  delete clean.created_at;
  return clean;
}

async function ensureEventMember({ supabase, eventId, userId, role }) {
  const { error } = await supabase
    .from("event_members")
    .upsert({ event_id: eventId, user_id: userId, role }, { onConflict: "event_id,user_id" });

  if (error) throw error;
}

// LISTA: por defecto NO incluye ocultos
export async function listEvents(supabase, { includeHidden = false } = {}) {
  let q = supabase
    .from('events')
    .select('id, owner_id, title, event_json, approved, hidden, hidden_at, hidden_by, created_at')
    .order('created_at', { ascending: false });

  if (!includeHidden) q = q.eq('hidden', false);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * CREA
 * Mantengo event_json porque al crear sí lo necesitas.
 */
export async function createEvent({
  supabase,
  supabaseAdmin, // opcional (recomendado)
  userId,
  role,
  title,
  event_json,
  owner_id,
}) {
  const finalOwnerId = role === "admin" ? owner_id ?? userId : userId;

  const eventWriter =
    role === "admin" && supabaseAdmin && finalOwnerId !== userId ? supabaseAdmin : supabase;

  const memberWriter = supabaseAdmin ?? supabase;
  const approved = role === "admin";

  const { data, error } = await eventWriter
    .from("events")
    .insert({
      owner_id: finalOwnerId,
      title,
      event_json,
      approved,
    })
    .select("id, owner_id, title, event_json, approved, created_at")
    .single();

  if (error) throw error;

  try {
    await ensureEventMember({
      supabase: memberWriter,
      eventId: data.id,
      userId: finalOwnerId,
      role: "owner",
    });

    if (role === "admin" && finalOwnerId !== userId) {
      await ensureEventMember({
        supabase: memberWriter,
        eventId: data.id,
        userId,
        role: "editor",
      });
    }
  } catch (e) {
    // rollback
    try {
      await memberWriter.from("events").delete().eq("id", data.id);
    } catch {
      // noop
    }
    throw e;
  }

  return data;
}

/**
 * GET completo (como lo tienes): incluye event_json.
 * Útil para el builder cuando sí necesitas cargar todo.
 */
export async function getEvent({ supabase, eventId }) {
  const { data, error } = await supabase
    .from('events')
    .select('id, owner_id, title, event_json, approved, hidden, hidden_at, hidden_by, created_at')
    .eq('id', eventId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * GET solo event_json (rápido y útil para merges server-side)
 */
export async function getEventJson({ supabase, eventId }) {
  const { data, error } = await supabase
    .from("events")
    .select("id, event_json")
    .eq("id", eventId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * UPDATE completo (mantengo por compatibilidad).
 * OJO: devuelve event_json, puede ser pesado.
 */
export async function updateEvent({ supabase, eventId, patch }) {
  const cleanPatch = sanitizePatch(patch);

  const { data, error } = await supabase
    .from('events')
    .update(cleanPatch)
    .eq('id', eventId)
    .select('id, owner_id, title, event_json, approved, created_at, hidden, hidden_at, hidden_by')
    .single();

  if (error) throw error;
  return data;
}

export async function hideEvent({ supabase, eventId, userId }) {
  const { error } = await supabase
    .from('events')
    .update({
      hidden: true,
      hidden_at: new Date().toISOString(),
      hidden_by: userId ?? null
    })
    .eq('id', eventId);

  if (error) throw error;
  return true;
}

/**
 * UPDATE mínimo (recomendado para autosave):
 * - NO devuelve event_json
 * - reduce carga en Postgres y red
 */
export async function updateEventMinimal({ supabase, eventId, patch }) {
  const cleanPatch = sanitizePatch(patch);
  const { error } = await supabase.from('events').update(cleanPatch).eq('id', eventId);
  if (error) throw error;
  return true;
}

export async function deleteEvent({ supabase, eventId }) {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;
  return true;
}
