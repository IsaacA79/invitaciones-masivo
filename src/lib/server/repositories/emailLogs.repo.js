import { supabaseAdmin } from '$lib/server/supabaseAdmin.server.js';

export async function logEmail({
  invitation_id,
  event_id = null,
  guest_id = null,
  provider = 'smtp',
  provider_message_id = null,
  status = 'queued',
  error = null
}) {
  const safeError = error ? String(error).slice(0, 2000) : null;

  const { data, error: dbErr } = await supabaseAdmin
    .from('email_logs')
    .insert({
      invitation_id,
      event_id,
      guest_id,
      provider,
      provider_message_id,
      status,
      error: safeError
    })
    .select('id')
    .single();

  if (dbErr) throw new Error(dbErr.message);
  return data; // { id }
}

// src/lib/server/repositories/emailLogs.repo.js

export async function listLogsByEvent({ supabase, eventId, limit = 200 }) {
  const { data, error } = await supabase
    .from('email_logs')
    .select(`
      id,
      created_at,
      status,
      error,
      invitations:invitation_id (
        id,
        guests:guest_id (
          id,
          name,
          email
        )
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

