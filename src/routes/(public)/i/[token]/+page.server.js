import { error } from '@sveltejs/kit';
import { hashToken } from '$lib/server/crypto.js';
import { getInvitationByTokenHash } from '$lib/server/repositories/invites.repo.js';

export async function load({ params, url }) {
  const token_hash = hashToken(params.token);
  const render = url.searchParams.get('render') === '1';

  
  const raw = Number(url.searchParams.get('scale') || '0.55');
  const renderScale = Number.isFinite(raw) ? Math.min(Math.max(raw, 0.2), 1) : 0.55;

  try {
    const inv = await getInvitationByTokenHash(token_hash);

    return {
      token: params.token,
      status: inv.status,
      event_title: inv.events?.title ?? 'Evento',
      event_json: inv.events?.event_json ?? null,
      guest_name: inv.guests?.name ?? null,
      guest_email: inv.guests?.email ?? null,
      guest_role: inv.guests?.role ?? null,
      guest_department: inv.guests?.department ?? null,
      render,
      renderScale
    };
  } catch (e) {
    throw error(404, 'Invitación no encontrada');
  }
}