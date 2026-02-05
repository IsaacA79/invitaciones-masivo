export function inviteEmailTemplate({
  guestName,
  eventName,
  message,
  viewUrl,
  confirmUrl,
  declineUrl,
  rsvpUrl,
  trackUrl
}) {
  const safeName = (guestName || '').trim() || 'Hola';
  const safeEvent = (eventName || '').trim() || 'Evento';
  const safeMsg = (message || '').replace(/\n/g, '<br/>');

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;max-width:600px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">${safeEvent}</h2>
    <p style="margin:0 0 10px;">${safeName},</p>
    <p style="margin:0 0 16px;">${safeMsg}</p>

    <p style="margin:0 0 14px;">
      <a href="${viewUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0ea5a4;color:#ffffff;text-decoration:none;">Ver invitación</a>
    </p>

    <p style="margin:0 0 14px;">
      <a href="${confirmUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#16a34a;color:#ffffff;text-decoration:none;margin-right:8px;">Confirmar</a>
      <a href="${declineUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#dc2626;color:#ffffff;text-decoration:none;">No podré asistir</a>
    </p>

    <p style="margin:0 0 8px;color:#555;">
      ¿Asistirás con acompañantes o quieres dejar un comentario?
      <a href="${rsvpUrl}">RSVP aquí</a>.
    </p>

    <p style="margin:0;color:#777;font-size:12px;word-break:break-all;">Link directo: ${viewUrl}</p>

    <img src="${trackUrl}" width="1" height="1" alt="" style="display:none" />
  </div>`;
}
