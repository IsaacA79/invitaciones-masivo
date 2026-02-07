// src/routes/api/send-invites/+server.js
import { json } from '@sveltejs/kit';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { upsertGuests, listGuests } from '$lib/server/repositories/guests.repo.js';
import { newToken, hashToken } from '$lib/server/crypto.js';
import { rateLimit, secondsUntil } from '$lib/server/rateLimit.js';
import { logEmail } from '$lib/server/repositories/emailLogs.repo.js';
import { sendInviteEmail } from '$lib/server/services/email/sendInviteEmail.js';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.server.js';
import sharp from 'sharp';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 900_000; // ajusta según tu caso (HTML + info)
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;
const MAX_GUESTS_PER_REQUEST = 2000;
const MAX_GUESTS_TOTAL = 5000;
const SLEEP_MS = 300;

const SEND_ROLES = new Set(['admin', 'sender', 'capturista']);

function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
}

export async function POST({ locals, request, url }) {
  const startedAt = Date.now();

  try {
    const { user } = await locals.safeGetSession();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const role = locals.role ?? (await locals.getRole(user.id));
    locals.role = role;

    if (!SEND_ROLES.has(role)) {
      return json({ error: 'Sin permisos para enviar invitaciones' }, { status: 403 });
    }

    const form = await request.formData();
    const body = safeJsonParse(form.get('payload'));

    const eventId = String(body.eventId || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();

    const image = form.get('image');
    const imageUrl = await generarImagen(body.eventId, image);

    if (!eventId || !UUID_RE.test(eventId)) return json({ error: 'eventId inválido' }, { status: 400 });
    if (subject.length < 3 || subject.length > MAX_SUBJECT) return json({ error: 'Asunto inválido' }, { status: 400 });
    if (message.length < 3 || message.length > MAX_MESSAGE) return json({ error: 'Mensaje inválido' }, { status: 400 });

    // ✅ corta intentos de mandar arrays enormes aunque el rol no los use aquí
    if (Array.isArray(body.guests) && body.guests.length > MAX_GUESTS_PER_REQUEST) {
      return json({ error: 'Demasiados invitados en una sola petición' }, { status: 413 });
    }

    // ✅ Rate limit (antes de DB / envío)
    const ip = String(locals.ip || '').slice(0, 80);

    const rl1 = await rateLimit({
      supabaseAdmin: locals.supabaseAdmin,
      key: `send:user:${user.id}:${eventId}`,
      limit: 2,
      windowSeconds: 60
    });

    const rl2 = await rateLimit({
      supabaseAdmin: locals.supabaseAdmin,
      key: `send:ip:${ip}:${eventId}`,
      limit: 3,
      windowSeconds: 60
    });

    if (rl1.reason) console.warn('[send-invites] rateLimit user reason:', rl1.reason);
    if (rl2.reason) console.warn('[send-invites] rateLimit ip reason:', rl2.reason);

    if (!rl1.allowed || !rl2.allowed) {
      const resetAt = rl1.resetAt || rl2.resetAt;
      const retry = Math.max(1, secondsUntil(resetAt) || 10);

      return json(
        { error: 'Rate limit: intenta de nuevo en unos segundos', retry_after: retry },
        { status: 429, headers: { 'Retry-After': String(retry) } }
      );
    }

    // ✅ Admin client (service role) requerido para invitations/logs
    const admin = locals.supabaseAdmin;
    if (!admin) {
      return json({ error: 'Server misconfig: supabaseAdmin no disponible' }, { status: 500 });
    }

    console.log('[send-invites] start', {
      eventId,
      role,
      userId: user.id,
      hasInformation: !!body.information,
      guestsIncoming: Array.isArray(body.guests) ? body.guests.length : 0
    });

    // ✅ Validar acceso al evento (RLS manda)
    const { data: event, error: evErr } = await locals.supabase
      .from('events')
      .select('id, owner_id, title, approved, hidden')
      .eq('id', eventId)
      .single();

    if (evErr || !event) {
      console.error('[send-invites] event access error', { eventId, evErr });
      return json({ error: evErr?.message || 'Evento no encontrado o sin acceso' }, { status: 404 });
    }

    // ✅ Si está oculto, se trata como no existente
    if (event.hidden) return json({ error: 'Evento no encontrado' }, { status: 404 });

    // ✅ Regla de negocio:
    // - admin puede enviar siempre
    // - sender/capturista solo si approved
    if (!event.approved && role !== 'admin') {
      return json({ error: 'Pendiente aprobación del admin para enviar' }, { status: 403 });
    }

    // ✅ Solo admin puede persistir cambios del builder desde el envío
    if (role === 'admin' && body.information && typeof body.information === 'object') {
      const nextTitle = String(body.information?.name || body.information?.title || event.title || 'Evento')
        .trim()
        .slice(0, 200);

      const { error: updErr } = await locals.supabase
        .from('events')
        .update({ event_json: body.information, title: nextTitle || event.title })
        .eq('id', eventId);

      if (updErr) {
        console.error('[send-invites] update event error', { eventId, updErr });
        return json({ error: updErr.message }, { status: 400 });
      }
    }

    // ✅ invitados:
    // - admin: puede upsert desde body.guests
    // - sender/capturista: NO modifica lista aquí; usa existentes
    let guests = [];

    if (role === 'admin') {
      const incoming = Array.isArray(body.guests) ? body.guests : [];
      try {
        guests = await upsertGuests({ supabase: locals.supabase, eventId, guests: incoming });
      } catch (e) {
        console.error('[send-invites] upsertGuests failed', { eventId, err: e });
        return json({ error: e?.message || 'Error guardando invitados' }, { status: 500 });
      }
    } else {
      try {
        guests = await listGuests({ supabase: locals.supabase, eventId });
      } catch (e) {
        console.error('[send-invites] listGuests failed', { eventId, err: e });
        return json({ error: e?.message || 'Error leyendo invitados' }, { status: 500 });
      }
    }

    if (!Array.isArray(guests) || guests.length === 0) {
      return json({ error: 'No hay invitados para enviar' }, { status: 400 });
    }

    if (guests.length > MAX_GUESTS_TOTAL) {
      return json({ error: 'Demasiados invitados para enviar en una sola corrida' }, { status: 413 });
    }

    const withEmail = guests.filter((g) => g?.email);
    console.log('[send-invites] guests loaded', {
      eventId,
      totalGuests: guests.length,
      withEmail: withEmail.length
    });

    const baseUrl = (PUBLIC_BASE_URL || url.origin).replace(/\/$/, '');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    let sent = 0;
    let failed = 0;

    const eventName = String(body.information?.name || event.title || 'Evento').trim();

    for (const g of guests) {
      if (!g?.email) continue;

      const token = newToken();
      const token_hash = hashToken(token);

      const { data: inv, error: invErr } = await admin
        .from('invitations')
        .upsert(
          { event_id: eventId, guest_id: g.id, token_hash, status: 'queued' },
          { onConflict: 'event_id,guest_id' }
        )
        .select('*')
        .single();

      if (invErr || !inv) {
        console.error('[send-invites] invitation upsert error', {
          eventId,
          guestId: g?.id,
          email: g?.email,
          invErr
        });
        failed++;
        continue;
      }

      try {
        await logEmail({
          invitation_id: inv.id,
          event_id: eventId,
          guest_id: g.id,
          status: 'queued',
          provider: 'smtp'
        });
      } catch (logErr) {
        console.error('[send-invites] logEmail queued failed', { invitationId: inv.id, logErr });
      }

      const viewUrl = `${baseUrl}/i/${token}`;
      const confirmUrl = `${baseUrl}/api/invites/${token}/confirm`;
      const declineUrl = `${baseUrl}/api/invites/${token}/decline`;
      const rsvpUrl = `${baseUrl}/rsvp/${token}`;
      const trackUrl = `${baseUrl}/api/invites/${token}/open.gif`;

      try {
        const info = await sendInviteEmail({
          to: g.email,
          guestName: g.name,
          role: g.role || '',
          department: g.department || '',
          eventName,
          subject,
          message,
          viewUrl,
          confirmUrl,
          declineUrl,
          rsvpUrl,
          trackUrl,
          imgsrc: imageUrl
        });

        await logEmail({
          invitation_id: inv.id,
          event_id: eventId,
          guest_id: g.id,
          status: 'sent',
          provider: 'smtp',
          provider_message_id: info?.messageId || null
        });

        await admin
          .from('invitations')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', inv.id);

        sent++;
        await sleep(SLEEP_MS);
      } catch (e) {
        console.error('[send-invites] email failed', {
          eventId,
          invitationId: inv.id,
          email: g.email,
          err: e?.message || e
        });

        try {
          await logEmail({
            invitation_id: inv.id,
            event_id: eventId,
            guest_id: g.id,
            status: 'failed',
            provider: 'smtp',
            error: e?.message || 'error'
          });
        } catch (logErr) {
          console.error('[send-invites] logEmail failed', { invitationId: inv.id, logErr });
        }

        try {
          await admin.from('invitations').update({ status: 'failed' }).eq('id', inv.id);
        } catch (updErr) {
          console.error('[send-invites] invitation status failed update error', {
            invitationId: inv.id,
            updErr
          });
        }

        failed++;
      }
    }

    const ms = Date.now() - startedAt;
    console.log('[send-invites] done', { eventId, role, sent, failed, total: guests.length, ms });

    return json({ ok: true, sent, failed, total: guests.length });
  } catch (e) {
    console.error('[send-invites] fatal', e);
    return json({ error: e?.message || 'Error interno enviando invitaciones' }, { status: 500 });
  }



}

async function generarImagen(eventId, file) {
  try {
    const bucket = 'imagenesEventos';
    const ext = (file?.name?.split('.').pop() || 'jpeg').toLowerCase();
    const path = `${eventId}.${ext}`;

    if (!file || !(file instanceof File)) return null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'image/jpeg';

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (error) return null;

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.error('[generarImagen] error', e);
    return null;
  }
}
