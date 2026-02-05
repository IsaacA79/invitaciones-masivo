// src/routes/(admin)/email-logs/+page.server.js
import { fail, redirect } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUS = new Set(['queued', 'sent', 'failed']);

function clamp(n, min, max) {
  n = Number(n);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export async function load({ locals, url }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(302, '/login');

  const role = locals.role ?? (await locals.getRole(user.id));
  if (!['admin', 'sender'].includes(role)) throw redirect(302, '/');

  const admin = locals.supabaseAdmin;

  const eventIdParam = String(url.searchParams.get('eventId') || '').trim();
  const statusParam = String(url.searchParams.get('status') || '').trim();
  const qParam = String(url.searchParams.get('q') || '').trim();

  const limit = clamp(url.searchParams.get('limit') || 50, 10, 200);
  const offset = clamp(url.searchParams.get('offset') || 0, 0, 100000);

  const status = statusParam && ALLOWED_STATUS.has(statusParam) ? statusParam : '';

  // Lista eventos (RLS manda con locals.supabase)
  const { data: events, error: evListErr } = await locals.supabase
    .from('events')
    .select('id, title, approved, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (evListErr) {
    console.error('[email-logs page] events list error', evListErr);
    return { user: { id: user.id }, role, events: [], selectedEventId: '', logs: [], count: 0, limit, offset, status, q: qParam };
  }

  const fallbackEventId = events?.[0]?.id || '';
  const selectedEventId = UUID_RE.test(eventIdParam) ? eventIdParam : fallbackEventId;

  let guestIds = null;
  const q = qParam.length >= 2 ? qParam : '';

  // Si hay búsqueda, resolvemos guest_ids por nombre/email para filtrar logs sin depender de filtros anidados
  if (q) {
    const { data: guests, error: gErr } = await admin
      .from('guests')
      .select('id')
      .eq('event_id', selectedEventId)
      .or(`email.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(500);

    if (gErr) {
      console.error('[email-logs page] guest search error', gErr);
      guestIds = [];
    } else {
      guestIds = (guests || []).map((x) => x.id);
    }
  }

  let query = admin
    .from('email_logs')
    .select(
      `
      id,
      invitation_id,
      event_id,
      guest_id,
      provider,
      provider_message_id,
      status,
      error,
      created_at,
      guests:guest_id ( name, email, role, department )
    `,
      { count: 'exact' }
    )
    .eq('event_id', selectedEventId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (guestIds) query = query.in('guest_id', guestIds.length ? guestIds : ['00000000-0000-0000-0000-000000000000']); // fuerza vacío

  const { data: logs, error: logsErr, count } = await query;

  if (logsErr) {
    console.error('[email-logs page] logs error', logsErr);
    return {
      user: { id: user.id },
      role,
      events: events || [],
      selectedEventId,
      logs: [],
      count: 0,
      limit,
      offset,
      status,
      q
    };
  }

  return {
    user: { id: user.id },
    role,
    events: events || [],
    selectedEventId,
    logs: logs || [],
    count: count ?? 0,
    limit,
    offset,
    status,
    q
  };
}

async function callRetryApi(event, payload) {
  const res = await event.fetch('/api/email-logs/retry', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error || 'Error reintentando', status: res.status };
  }
  return data;
}

export const actions = {
  retryFailed: async (event) => {
    const { locals } = event;
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Unauthorized' });

    const role = locals.role ?? (await locals.getRole(user.id));
    if (!['admin', 'sender'].includes(role)) return fail(403, { message: 'Sin permisos' });

    const fd = await event.request.formData();
    const eventId = String(fd.get('eventId') || '').trim();
    const limit = clamp(fd.get('limit') || 200, 1, 2000);

    const subject = String(fd.get('subject') || '').trim();
    const message = String(fd.get('message') || '').trim();

    if (!UUID_RE.test(eventId)) return fail(400, { message: 'eventId inválido' });

    const resp = await callRetryApi(event, {
      eventId,
      limit,
      ...(subject ? { subject } : {}),
      ...(message ? { message } : {})
    });

    if (!resp?.ok) return fail(resp?.status || 500, { message: resp?.error || 'Error' });

    return { ok: true, retry: resp };
  },

  retrySelected: async (event) => {
    const { locals } = event;
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Unauthorized' });

    const role = locals.role ?? (await locals.getRole(user.id));
    if (!['admin', 'sender'].includes(role)) return fail(403, { message: 'Sin permisos' });

    const fd = await event.request.formData();
    const eventId = String(fd.get('eventId') || '').trim();

    const invitationIds = fd.getAll('invitationIds').map((x) => String(x).trim()).filter((x) => UUID_RE.test(x));

    const subject = String(fd.get('subject') || '').trim();
    const message = String(fd.get('message') || '').trim();

    if (!UUID_RE.test(eventId)) return fail(400, { message: 'eventId inválido' });
    if (!invitationIds.length) return fail(400, { message: 'Selecciona al menos un log' });

    const resp = await callRetryApi(event, {
      eventId,
      invitationIds,
      ...(subject ? { subject } : {}),
      ...(message ? { message } : {})
    });

    if (!resp?.ok) return fail(resp?.status || 500, { message: resp?.error || 'Error' });

    return { ok: true, retry: resp };
  }
};
