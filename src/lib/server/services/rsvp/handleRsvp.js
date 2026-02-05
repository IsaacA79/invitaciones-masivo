// src/lib/server/services/rsvp/handleRsvp.js
import { json, redirect } from '@sveltejs/kit';
import { hashToken } from '$lib/server/crypto.js';
import { writeAuditLog } from '$lib/server/repositories/auditLogs.repo.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{20,256}$/;

async function safeUpdateInvitationStatus(admin, invitationId, nextStatus) {
  // intentamos guardar responded_at si existe; si no, caemos a status-only
  const now = new Date().toISOString();

  let { error } = await admin
    .from('invitations')
    .update({ status: nextStatus, responded_at: now })
    .eq('id', invitationId);

  if (!error) return;

  // fallback si tu tabla no tiene responded_at
  if (String(error.message || '').toLowerCase().includes('responded_at')) {
    const res2 = await admin
      .from('invitations')
      .update({ status: nextStatus })
      .eq('id', invitationId);

    if (res2.error) throw new Error(res2.error.message);
    return;
  }

  throw new Error(error.message);
}

async function getGuestEmail(admin, guestId) {
  if (!guestId) return null;
  const { data, error } = await admin
    .from('guests')
    .select('email')
    .eq('id', guestId)
    .single();

  if (error) return null;
  return data?.email ?? null;
}

/**
 * Maneja confirm/decline (GET y POST)
 */
export async function handleRsvp(event, nextStatus) {
  const { params, locals, request } = event;

  const token = String(params.token || '').trim();
  if (!token || !TOKEN_RE.test(token)) {
    // no revelar detalles
    return json({ ok: false, error: 'Not found' }, { status: 404, headers: { 'cache-control': 'no-store' } });
  }

  const admin = locals.supabaseAdmin;
  if (!admin) {
    return json({ ok: false, error: 'Server misconfigured' }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }

  const token_hash = hashToken(token);

  // 1) Encontrar invitación
  const { data: inv, error: invErr } = await admin
    .from('invitations')
    .select('id,event_id,guest_id,status')
    .eq('token_hash', token_hash)
    .single();

  if (invErr || !inv) {
    return json({ ok: false, error: 'Not found' }, { status: 404, headers: { 'cache-control': 'no-store' } });
  }

  const prevStatus = inv.status;

  // 2) Idempotencia: si ya está en ese estado, no re-escribimos; pero podemos auditar si quieres
  if (prevStatus !== nextStatus) {
    await safeUpdateInvitationStatus(admin, inv.id, nextStatus);
  }

  // 3) Audit log (actor = guest_id)
  const ip = event.getClientAddress?.() ?? null;
  const user_agent = request.headers.get('user-agent');

  // actor_id es NOT NULL en audit_logs, así que usamos guest_id (si viene null, omitimos el audit)
  if (inv.guest_id) {
    const targetEmail = await getGuestEmail(admin, inv.guest_id);

    try {
      await writeAuditLog({
        admin,
        actor_id: inv.guest_id,
        action: nextStatus === 'confirmed' ? 'rsvp.confirm' : 'rsvp.decline',
        target_id: inv.id,
        target_email: targetEmail,
        ip,
        user_agent,
        meta: {
          event_id: inv.event_id,
          invitation_id: inv.id,
          prev_status: prevStatus,
          next_status: nextStatus,
          duplicate: prevStatus === nextStatus
        }
      });
    } catch (e) {
      // no bloqueamos el RSVP si falla auditoría
      console.error('[audit] rsvp log failed', e);
    }
  }

  // 4) Respuesta según método (GET -> redirect, POST -> json)
  if (request.method === 'GET') {
    // manda al panel RSVP público, así no ven JSON en el navegador
    throw redirect(303, `/rsvp/${token}?status=${encodeURIComponent(nextStatus)}`);
  }

  return json(
    { ok: true, status: nextStatus },
    { status: 200, headers: { 'cache-control': 'no-store' } }
  );
}
