import { error } from '@sveltejs/kit';
import { hashToken } from '$lib/server/crypto.js';
import { getInvitationByTokenHash } from '$lib/server/repositories/invites.repo.js';

export async function load({ params }) {
  const token_hash = hashToken(params.token);
  try {
    const inv = await getInvitationByTokenHash(token_hash);
    return {
      token: params.token,
      status: inv.status,
      event_title: inv.events?.title ?? 'Evento',
      event_json: inv.events?.event_json ?? null,
      guest_name: inv.guests?.name ?? null,
      guest_email: inv.guests?.email ?? null,
      response_json: inv.response_json ?? null
    };
  } catch (e) {
    throw error(404, 'Invitación no encontrada');
  }
}
