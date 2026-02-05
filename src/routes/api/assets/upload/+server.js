import { json } from '@sveltejs/kit';

function safeName(name = 'file') {
  return String(name).replace(/[^a-z0-9._-]+/gi, '_');
}

export async function POST({ locals, request }) {
  // ✅ No uses locals.user aquí (no viene del layout admin)
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const fd = await request.formData();
  const file = fd.get('file');
  const eventId = String(fd.get('eventId') || '').trim();

  if (!eventId) return json({ error: 'No hay evento seleccionado' }, { status: 400 });
  if (!file || typeof file === 'string') return json({ error: 'Archivo requerido' }, { status: 400 });

  // ✅ Verifica acceso al evento con el cliente de sesión (RLS manda)
  const { data: ev, error: evErr } = await locals.supabase
    .from('events')
    .select('id, event_json')
    .eq('id', eventId)
    .single();

  if (evErr) return json({ error: 'Evento no encontrado o sin acceso' }, { status: 404 });

  // ✅ Subir a Supabase Storage (recomendado, persistente)
  // Crea un bucket en Supabase llamado: event-assets (Public)
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || 'bin';
  const path = `events/${eventId}/bg-${Date.now()}-${safeName(file.name || 'bg')}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await locals.supabaseAdmin.storage
    .from('event-assets')
    .upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: true });

  if (up.error) return json({ error: up.error.message }, { status: 400 });

  const { data: pub } = locals.supabaseAdmin.storage.from('event-assets').getPublicUrl(path);
  const url = pub?.publicUrl;
  if (!url) return json({ error: 'No se pudo generar URL' }, { status: 500 });

  // ✅ Persistir en event_json.design.bgImage
  const next = structuredClone(ev.event_json ?? {});
  next.design = next.design ?? {};
  next.design.bgImage = url;

  const { error: updErr } = await locals.supabase
    .from('events')
    .update({ event_json: next })
    .eq('id', eventId);

  if (updErr) return json({ error: updErr.message }, { status: 400 });

  return json({ url }, { status: 200 });
}
