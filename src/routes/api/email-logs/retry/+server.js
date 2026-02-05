// src/routes/api/email-logs/retry/+server.js
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

import { newToken, hashToken } from '$lib/server/crypto.js';
import { logEmail } from '$lib/server/repositories/emailLogs.repo.js';
import { sendInviteEmail } from '$lib/server/services/email/sendInviteEmail.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

const DEFAULT_LIMIT = 200; // reintentos por request
const MAX_LIMIT = 2000;

const DEFAULT_SCAN_LIMIT = 5000; // logs recientes a escanear para inferir "último estado"
const MAX_SCAN_LIMIT = 20000;

const SLEEP_MS = 300;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Opción B (recomendada): NO depender de env var.
 * - Si existe env.PUBLIC_BASE_URL, lo usa (útil si quieres forzar dominio).
 * - Si no existe, arma baseUrl desde headers (x-forwarded-*) o host.
 * - Fallback: url.origin.
 */
function getBaseUrl({ url, request }) {
  // 0) opcional (no requerido): si lo configuras en Netlify, lo usamos
  const configured = String(env.PUBLIC_BASE_URL ?? '').trim();
  if (configured) return configured.replace(/\/$/, '');

  // 1) Netlify / proxies (lo más confiable en producción)
  const xfProto = request.headers.get('x-forwarded-proto');
  const xfHost = request.headers.get('x-forwarded-host');

  const host = (xfHost ?? request.headers.get('host') ?? '').trim();
  if (host) {
    const proto = String(
      xfProto ?? url.protocol.replace(':', '') ?? 'https'
    ).trim();
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  // 2) Fallback final
  return String(url.origin).replace(/\/$/, '');
}

export async function POST({ locals, request, url }) {
  const startedAt = Date.now();

  try {
    const { user } = await locals.safeGetSession();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const role = locals.role ?? (await locals.getRole(user.id));
    if (!['admin', 'sender'].includes(role)) {
      return json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    const eventId = String(body.eventId || '').trim();
    const invitationIds = Array.isArray(body.invitationIds)
      ? body.invitationIds.map((x) => String(x).trim())
      : [];

    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();

    const limit = Math.min(
      Math.max(Number(body.limit || DEFAULT_LIMIT), 1),
      MAX_LIMIT
    );
    const scanLimit = Math.min(
      Math.max(Number(body.scanLimit || DEFAULT_SCAN_LIMIT), 100),
      MAX_SCAN_LIMIT
    );

    if (!eventId || !UUID_RE.test(eventId)) {
      return json({ error: 'eventId inválido' }, { status: 400 });
    }
    if (subject && (subject.length < 3 || subject.length > MAX_SUBJECT)) {
      return json({ error: 'Asunto inválido' }, { status: 400 });
    }
    if (message && (message.length < 3 || message.length > MAX_MESSAGE)) {
      return json({ error: 'Mensaje inválido' }, { status: 400 });
    }

    const admin = locals.supabaseAdmin;

    // ✅ baseUrl real (no depende de $env/static/public)
    const baseUrl = getBaseUrl({ url, request });

    // 1) Validar acceso al evento (con el cliente del usuario)
    const { data: event, error: evErr } = await locals.supabase
      .from('events')
      .select('id, title, event_json, approved')
      .eq('id', eventId)
      .single();

    if (evErr || !event) {
      console.error('[email-logs/retry] event access error', { eventId, evErr });
      return json(
        { error: evErr?.message || 'Evento no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    if (!event.approved && role !== 'admin') {
      return json(
        { error: 'Pendiente aprobación del admin para reintentar' },
        { status: 403 }
      );
    }

    const eventName = String(event?.event_json?.name || event.title || 'Evento')
      .trim()
      .slice(0, 200);

    const finalSubject =
      (subject || `Invitación: ${eventName}`).slice(0, MAX_SUBJECT);

    const finalMessage =
      message || 'Te comparto nuevamente tu invitación.';

    // 2) Determinar invitaciones elegibles
    let eligibleInvitationIds = [];

    if (invitationIds.length) {
      // Modo explícito: reintentar SOLO estas invitaciones
      const clean = invitationIds.filter((x) => UUID_RE.test(x));
      eligibleInvitationIds = Array.from(new Set(clean)).slice(0, limit);
    } else {
      // Modo automático: tomar invitaciones cuyo ÚLTIMO log sea failed
      const { data: logs, error: logsErr } = await admin
        .from('email_logs')
        .select('invitation_id, status, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(scanLimit);

      if (logsErr) {
        console.error('[email-logs/retry] logs query error', { eventId, logsErr });
        return json({ error: logsErr.message }, { status: 500 });
      }

      // primer estado visto por invitation_id = "último"
      const lastByInvitation = new Map();
      for (const row of logs || []) {
        const invId = row.invitation_id;
        if (!invId) continue;
        if (!lastByInvitation.has(invId)) lastByInvitation.set(invId, row.status);
      }

      for (const [invId, st] of lastByInvitation.entries()) {
        if (st === 'failed') eligibleInvitationIds.push(invId);
        if (eligibleInvitationIds.length >= limit) break;
      }
    }

    if (!eligibleInvitationIds.length) {
      return json({
        ok: true,
        baseUrl,
        eligible: 0,
        sent: 0,
        failed: 0,
        results: []
      });
    }

    // 3) Traer invitaciones + datos del invitado
    const { data: invitations, error: invErr } = await admin
      .from('invitations')
      .select('id, event_id, guest_id, guests(name,email,role,department)')
      .in('id', eligibleInvitationIds);

    if (invErr) {
      console.error('[email-logs/retry] invitations query error', { eventId, invErr });
      return json({ error: invErr.message }, { status: 500 });
    }

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const inv of invitations || []) {
      const guest = inv.guests;
      const email = String(guest?.email || '').trim();

      if (!email) {
        failed++;
        results.push({ ok: false, invitationId: inv.id, error: 'Invitado sin email' });
        continue;
      }

      // 4) Nuevo token (solo guardas token_hash)
      const token = newToken();
      const token_hash = hashToken(token);

      const { error: updInvErr } = await admin
        .from('invitations')
        .update({ token_hash, status: 'queued' })
        .eq('id', inv.id);

      if (updInvErr) {
        failed++;
        results.push({ ok: false, invitationId: inv.id, error: updInvErr.message });
        continue;
      }

      // 5) Log queued (best-effort)
      try {
        await logEmail({
          invitation_id: inv.id,
          event_id: inv.event_id,
          guest_id: inv.guest_id,
          status: 'queued',
          provider: 'smtp'
        });
      } catch (logErr) {
        console.error('[email-logs/retry] log queued failed', { invitationId: inv.id, logErr });
      }

      const viewUrl = `${baseUrl}/i/${token}`;
      const confirmUrl = `${baseUrl}/api/invites/${token}/confirm`;
      const declineUrl = `${baseUrl}/api/invites/${token}/decline`;
      const rsvpUrl = `${baseUrl}/rsvp/${token}`;
      const trackUrl = `${baseUrl}/api/invites/${token}/open.gif`;

      try {
        const info = await sendInviteEmail({
          to: email,
          guestName: guest?.name || '',
          role: guest?.role || '',
          department: guest?.department || '',
          eventName,
          subject: finalSubject,
          message: finalMessage,
          viewUrl,
          confirmUrl,
          declineUrl,
          rsvpUrl,
          trackUrl
        });

        await logEmail({
          invitation_id: inv.id,
          event_id: inv.event_id,
          guest_id: inv.guest_id,
          status: 'sent',
          provider: 'smtp',
          provider_message_id: info?.messageId || null
        });

        await admin
          .from('invitations')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', inv.id);

        sent++;
        results.push({ ok: true, invitationId: inv.id, email });
        await sleep(SLEEP_MS);
      } catch (e) {
        console.error('[email-logs/retry] send failed', {
          invitationId: inv.id,
          email,
          err: e?.message || e
        });

        // log failed (best-effort)
        try {
          await logEmail({
            invitation_id: inv.id,
            event_id: inv.event_id,
            guest_id: inv.guest_id,
            status: 'failed',
            provider: 'smtp',
            error: e?.message || 'error'
          });
        } catch (logErr) {
          console.error('[email-logs/retry] log failed failed', { invitationId: inv.id, logErr });
        }

        // marcar invitación como failed (best-effort)
        try {
          await admin.from('invitations').update({ status: 'failed' }).eq('id', inv.id);
        } catch (updErr) {
          console.error('[email-logs/retry] invitation status failed update error', {
            invitationId: inv.id,
            updErr
          });
        }

        failed++;
        results.push({ ok: false, invitationId: inv.id, email, error: e?.message || 'Error' });
      }
    }

    const ms = Date.now() - startedAt;
    console.log('[email-logs/retry] done', {
      eventId,
      baseUrl,
      eligible: eligibleInvitationIds.length,
      sent,
      failed,
      ms
    });

    return json({
      ok: true,
      baseUrl,
      eligible: eligibleInvitationIds.length,
      sent,
      failed,
      results
    });
  } catch (e) {
    console.error('[email-logs/retry] fatal', e);
    return json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
