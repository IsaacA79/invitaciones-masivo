import { supabaseAdmin } from '$lib/server/supabaseAdmin.server'; // o .server.js según tu archivo

export async function logQueued({ invitationId, eventId, guestId, provider = 'smtp' }) {
  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .insert({
      invitation_id: invitationId,
      event_id: eventId,
      guest_id: guestId,
      provider,
      status: 'queued'
    })
    .select('id')
    .single();

  if (error) throw new Error(`email_logs insert queued: ${error.message}`);
  return data.id;
}

export async function logSent(logId, { providerMessageId = null } = {}) {
  const { error } = await supabaseAdmin
    .from('email_logs')
    .update({
      status: 'sent',
      provider_message_id: providerMessageId,
      error: null
    })
    .eq('id', logId);

  if (error) throw new Error(`email_logs update sent: ${error.message}`);
}

export async function logFailed(logId, err) {
  const msg = (err?.message ? String(err.message) : 'Error desconocido').slice(0, 2000);

  const { error } = await supabaseAdmin
    .from('email_logs')
    .update({
      status: 'failed',
      error: msg
    })
    .eq('id', logId);

  if (error) throw new Error(`email_logs update failed: ${error.message}`);
}
