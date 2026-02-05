// src/lib/server/repositories/auditLogs.repo.js
export async function writeAuditLog({
  admin,            // locals.supabaseAdmin (service role)
  actor_id,
  action,
  target_id = null,
  target_email = null,
  ip = null,
  user_agent = null,
  meta = {}
}) {
  if (!admin) throw new Error('Falta client admin');
  if (!actor_id) throw new Error('Falta actor_id');
  if (!action) throw new Error('Falta action');

  // user-agent muy largo puede causar problemas
  const ua = user_agent ? String(user_agent).slice(0, 400) : null;

  const { error } = await admin
    .from('audit_logs')
    .insert({
      actor_id,
      action,
      target_id,
      target_email,
      ip,
      user_agent: ua,
      meta
    });

  if (error) throw new Error(error.message);
}
