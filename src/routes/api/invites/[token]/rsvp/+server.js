import { json, redirect } from '@sveltejs/kit';
import { hashToken } from '$lib/server/crypto.js';
import { getInvitationByTokenHash, respond } from '$lib/server/repositories/invites.repo.js';

function clampInt(n, min, max) {
  const x = Number.parseInt(String(n), 10);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export async function POST({ params, request }) {
  const token_hash = hashToken(params.token);
  const inv = await getInvitationByTokenHash(token_hash);

  let attending;
  let guests_count;
  let comment;

  const ct = request.headers.get('content-type') || '';

  if (ct.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    attending = body.attending;
    guests_count = body.guests_count;
    comment = body.comment;
  } else {
    const fd = await request.formData();
    attending = fd.get('attending');
    guests_count = fd.get('guests_count');
    comment = fd.get('comment');
  }

  // normaliza attending
  const att = attending === true || attending === 'true' || attending === 'yes' || attending === '1' || attending === 'on';
  const count = att ? clampInt(guests_count ?? 1, 1, 20) : 0;
  const cmt = String(comment || '').slice(0, 500);

  const status = att ? 'confirmed' : 'declined';
  await respond(inv.id, status, { attending: att, guests_count: count, comment: cmt });

  // si es fetch/json, regresamos json
  if (ct.includes('application/json')) {
    return json({ ok: true, status, guests_count: count });
  }

  throw redirect(303, `/thanks?status=${status}`);
}
