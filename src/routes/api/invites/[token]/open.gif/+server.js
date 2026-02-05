import { hashToken } from '$lib/server/crypto.js';
import { getInvitationByTokenHash, markOpened } from '$lib/server/repositories/invites.repo.js';

// 1x1 GIF transparente
const GIF_BASE64 = 'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const gif = Buffer.from(GIF_BASE64, 'base64');

export async function GET({ params }) {
  try {
    const token_hash = hashToken(params.token);
    const inv = await getInvitationByTokenHash(token_hash);
    await markOpened(inv.id);
  } catch (_) {
    // silenciar errores
  }

  return new Response(gif, {
    headers: {
      'content-type': 'image/gif',
      'cache-control': 'no-store'
    }
  });
}
