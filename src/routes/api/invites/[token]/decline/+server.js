import { redirect } from '@sveltejs/kit';
import { hashToken } from '$lib/server/crypto.js';
import { getInvitationByTokenHash, respond } from '$lib/server/repositories/invites.repo.js';
import { writeAuditLog } from '$lib/server/repositories/auditLogs.repo.js';

async function handleDecline(event) {
  const { params, locals, request } = event;

  const token = String(params.token || '').trim();
  const token_hash = hashToken(token);

  const inv = await getInvitationByTokenHash(token_hash);
  if (!inv?.id) throw new Error('Invitación no encontrada');

  const prevStatus = inv.status;
  const payload = { attending: false, guests_count: 0, comment: '' };
  const duplicate = prevStatus === 'declined';

  // ✅ si ya estaba declinado, NO re-escribimos
  if (!duplicate) {
    await respond(inv.id, 'declined', payload);
  }

  // ✅ AUDIT (sin token)
  try {
    const ip = event.getClientAddress?.() ?? null;
    const ua = request.headers.get('user-agent');

    if (inv.guest_id) {
      await writeAuditLog({
        admin: locals.supabaseAdmin,
        actor_id: inv.guest_id,
        action: 'rsvp.decline',
        target_id: inv.id,
        target_email: inv?.guests?.email ?? null,
        ip,
        user_agent: ua,
        meta: {
          event_id: inv.event_id ?? inv?.events?.id ?? null,
          invitation_id: inv.id,
          prev_status: prevStatus,
          next_status: 'declined',
          duplicate,
          payload
        }
      });
    }
  } catch (e) {
    console.error('[audit] rsvp.decline failed', e);
  }
}

export async function GET(event) {
  await handleDecline(event);
  throw redirect(302, `/thanks?status=declined`);
}

export async function POST(event) {
  await handleDecline(event);
  throw redirect(303, `/thanks?status=declined`);
}
