// src/routes/api/email-logs/+server.js
import { json } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUS = new Set(['queued', 'sent', 'failed']);

export async function GET({ locals, url }) {
  try {
    const { user } = await locals.safeGetSession();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const role = locals.role ?? (await locals.getRole(user.id));
    if (!['admin', 'sender'].includes(role)) {
      return json({ error: 'Sin permisos' }, { status: 403 });
    }

    const eventId = String(url.searchParams.get('eventId') || '').trim();
    const status = String(url.searchParams.get('status') || '').trim();
    const invitationId = String(url.searchParams.get('invitationId') || '').trim();
    const guestId = String(url.searchParams.get('guestId') || '').trim();

    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 200);
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

    if (!eventId || !UUID_RE.test(eventId)) return json({ error: 'eventId inválido' }, { status: 400 });
    if (status && !ALLOWED_STATUS.has(status)) return json({ error: 'status inválido' }, { status: 400 });
    if (invitationId && !UUID_RE.test(invitationId)) return json({ error: 'invitationId inválido' }, { status: 400 });
    if (guestId && !UUID_RE.test(guestId)) return json({ error: 'guestId inválido' }, { status: 400 });

    const admin = locals.supabaseAdmin;

    let q = admin
      .from('email_logs')
      .select(
        'id, invitation_id, event_id, guest_id, provider, provider_message_id, status, error, created_at',
        { count: 'exact' }
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) q = q.eq('status', status);
    if (invitationId) q = q.eq('invitation_id', invitationId);
    if (guestId) q = q.eq('guest_id', guestId);

    const { data, error, count } = await q;

    if (error) {
      console.error('[email-logs] query error', { eventId, error });
      return json({ error: error.message }, { status: 500 });
    }

    return json({ ok: true, data: data || [], count: count ?? null, limit, offset });
  } catch (e) {
    console.error('[email-logs] fatal', e);
    return json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
