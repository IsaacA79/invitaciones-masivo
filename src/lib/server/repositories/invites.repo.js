import { supabaseAdmin } from '$lib/server/supabaseAdmin.server.js';

export async function createInvitation({ event_id, guest_id, token_hash }) {
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .insert({ event_id, guest_id, token_hash, status: 'queued' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getInvitationByTokenHash(token_hash) {
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('*, guests(*), events(*)')
    .eq('token_hash', token_hash)
    .single();
  if (error) throw error;
  return data;
}

export async function markOpened(invitation_id) {
  await supabaseAdmin
    .from('invitations')
    .update({ status: 'opened', opened_at: new Date().toISOString() })
    .eq('id', invitation_id);
}

export async function markSent(invitation_id) {
  await supabaseAdmin
    .from('invitations')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invitation_id);
}

export async function respond(invitation_id, status, response_json = {}) {
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .update({ status, responded_at: new Date().toISOString(), response_json })
    .eq('id', invitation_id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
