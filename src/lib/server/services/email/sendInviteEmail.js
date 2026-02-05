// src/lib/server/services/email/sendInviteEmail.js
import { transporter } from './transporter.js';
import { GMAIL_USER, GMAIL_FROM_NAME } from '$env/static/private';
import { renderInviteJpg } from './renderInviteImage.js';
import crypto from 'node:crypto';

function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ✅ filename seguro (Windows/macOS/iOS)
function safeFilenamePart(s = '') {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\/\\:*?"<>|]/g, '') // inválidos Windows
    .replace(/[^\p{L}\p{N} ._-]/gu, '') // deja letras/números/espacios/punto/guion
    .slice(0, 55) || 'SinNombre';
}

function guestLine({ role, department }) {
  const parts = [role, department]
    .map((x) => String(x || '').trim())
    .filter(Boolean);

  if (!parts.length) return '';
  return `<p style="margin:0 0 10px 0;color:#555;font-size:13px;">${escapeHtml(parts.join(' · '))}</p>`;
}

function inviteHtml({
  guestName,
  role,
  department,
  eventName,
  message,
  viewUrl,
  confirmUrl,
  declineUrl,
  rsvpUrl,
  trackUrl,
  hasImage,
  cid,
  attachmentLabel
}) {
  const name = escapeHtml(guestName || 'Hola');
  const ev = escapeHtml(eventName || 'Evento');
  const msg = escapeHtml(message || '').replaceAll('\n', '<br/>');

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 8px 0;">${ev}</h2>

    <p style="margin:0 0 6px 0;">${name},</p>
    ${guestLine({ role, department })}

    ${
      hasImage
        ? `
      <div style="margin:10px 0 16px 0;text-align:center;">
        <img src="cid:${cid}" alt="Invitación"
          style="width:100%;max-width:420px;height:auto;border-radius:12px;border:1px solid #eee;display:inline-block;" />
        <div style="margin-top:6px;font-size:12px;color:#777;">
          Si no puedes ver la imagen, abre el adjunto “${escapeHtml(attachmentLabel)}”.
        </div>
      </div>
    `
        : ''
    }

    <p style="margin:0 0 16px 0;">${msg}</p>

    <p style="margin:0 0 12px 0;">
      <a href="${viewUrl}" style="display:inline-block;padding:12px 16px;background:#0ea5a4;color:#fff;text-decoration:none;border-radius:10px;">
        Ver invitación
      </a>
    </p>

    <p style="margin:0 0 12px 0;">
      <a href="${confirmUrl}" style="display:inline-block;padding:10px 14px;background:#16a34a;color:#fff;text-decoration:none;border-radius:10px;margin-right:8px;">
        Confirmar asistencia
      </a>
      <a href="${declineUrl}" style="display:inline-block;padding:10px 14px;background:#dc2626;color:#fff;text-decoration:none;border-radius:10px;">
        No podré asistir
      </a>
    </p>

    <p style="margin:0 0 12px 0;">
      ¿Acompañantes o comentario? Confirma aquí:
      <a href="${rsvpUrl}">${rsvpUrl}</a>
    </p>

    <p style="color:#666;font-size:12px;margin:18px 0 0 0;">
      Si no ves los botones, abre el enlace: <a href="${viewUrl}">${viewUrl}</a>
    </p>

    <img src="${trackUrl}" width="1" height="1" alt="" style="display:none;" />
  </div>`;
}

export async function sendInviteEmail({
  to,
  subject,
  guestName,
  role,
  department,
  eventName,
  message,
  viewUrl,
  confirmUrl,
  declineUrl,
  rsvpUrl,
  trackUrl
}) {
  const from = `${GMAIL_FROM_NAME} <${GMAIL_USER}>`;

  // ✅ CID único por correo (evita cache en envíos masivos)
  const cid = `invite-${crypto.randomUUID()}@inv`;

  // ✅ filename con invitado + evento
  const guestSafe = safeFilenamePart(guestName || to || 'Invitado');
  const eventSafe = safeFilenamePart(eventName || 'Evento');
  const attachmentName = `Invitacion - ${guestSafe} - ${eventSafe}.jpg`;

  // ✅ Render a imagen (si falla, manda sin imagen)
  let inviteImage = null;
  try {
    const scale = 0.55;
    const renderUrl = `${viewUrl}${viewUrl.includes('?') ? '&' : '?'}render=1&scale=${scale}`;
    inviteImage = await renderInviteJpg({ renderUrl });
  } catch {
    inviteImage = null;
  }

  const html = inviteHtml({
    guestName,
    role,
    department,
    eventName,
    message,
    viewUrl,
    confirmUrl,
    declineUrl,
    rsvpUrl,
    trackUrl,
    hasImage: Boolean(inviteImage),
    cid,
    attachmentLabel: attachmentName
  });

  const extra = [role, department].map((s) => String(s || '').trim()).filter(Boolean).join(' · ');

  const text =
    `${eventName || 'Evento'}\n\n` +
    `${guestName || 'Hola'}${extra ? ` (${extra})` : ''}\n\n` +
    `${message || ''}\n\n` +
    `Ver invitación: ${viewUrl}\n` +
    `Confirmar: ${confirmUrl}\n` +
    `No asistir: ${declineUrl}\n` +
    `RSVP (acompañantes/comentario): ${rsvpUrl}\n`;

  const attachments = inviteImage
    ? [
        // 1) INLINE (para mostrarse dentro)
        {
          filename: `inline-${attachmentName}`,
          content: inviteImage,
          cid,
          contentType: 'image/jpeg',
          contentDisposition: 'inline',
          encoding: 'base64',
          headers: { 'Content-ID': `<${cid}>` }
        },
        // 2) ADJUNTO NORMAL (con invitado + evento)
        {
          filename: attachmentName,
          content: inviteImage,
          contentType: 'image/jpeg',
          contentDisposition: 'attachment',
          encoding: 'base64'
        }
      ]
    : [];

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    attachments
  });

  return { messageId: info.messageId };
}
