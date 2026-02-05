// src/routes/(admin)/audit-logs/+page.server.js
import { redirect } from '@sveltejs/kit';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIONS = ['user.create', 'user.invite', 'user.set_role', 'user.set_password'];

function clamp(n, min, max) {
  n = Number(n);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

async function requireAdmin(locals) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const role = locals.role ?? (await locals.getRole(user.id));
  if (role !== 'admin') throw redirect(303, '/events');

  return { user, role };
}

function asDateISO(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  // esperamos "YYYY-MM-DD"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  return s;
}

export async function load({ locals, url }) {
  await requireAdmin(locals);

  const admin = locals.supabaseAdmin;

  const action = String(url.searchParams.get('action') || '').trim();
  const q = String(url.searchParams.get('q') || '').trim();
  const from = asDateISO(url.searchParams.get('from'));
  const to = asDateISO(url.searchParams.get('to'));

  const limit = clamp(url.searchParams.get('limit') || 50, 10, 200);
  const offset = clamp(url.searchParams.get('offset') || 0, 0, 100000);

  // Query base
  let query = admin
    .from('audit_logs')
    .select('id, actor_id, action, target_id, target_email, ip, user_agent, meta, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action && ACTIONS.includes(action)) {
    query = query.eq('action', action);
  }

  if (from) {
    query = query.gte('created_at', `${from}T00:00:00.000Z`);
  }
  if (to) {
    query = query.lte('created_at', `${to}T23:59:59.999Z`);
  }

  // Búsqueda simple: target_email o action o actor_id/target_id si pega UUID
  const qq = q.length >= 2 ? q : '';
  if (qq) {
    if (UUID_RE.test(qq)) {
      query = query.or(`actor_id.eq.${qq},target_id.eq.${qq}`);
    } else {
      const safe = qq.replaceAll(',', ' ');
      query = query.or(`target_email.ilike.%${safe}%,action.ilike.%${safe}%`);
    }
  }

  const { data: logs, error, count } = await query;

  if (error) {
    console.error('[audit-logs] query error', error);
    return {
      logs: [],
      count: 0,
      limit,
      offset,
      action,
      q: qq,
      from,
      to,
      actions: ACTIONS,
      actorsById: {},
      targetsById: {}
    };
  }

  const rows = logs || [];

  // Mapear actor_id y target_id -> email (profiles)
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean)));
  const targetIds = Array.from(new Set(rows.map((r) => r.target_id).filter(Boolean)));

  const actorsById = {};
  const targetsById = {};

  // OJO: no dependemos de FK; resolvemos por IN(...)
  if (actorIds.length) {
    const { data: actorProfiles } = await admin
      .from('profiles')
      .select('id,email,role')
      .in('id', actorIds);

    for (const p of actorProfiles || []) {
      actorsById[p.id] = { email: p.email, role: p.role };
    }
  }

  if (targetIds.length) {
    const { data: targetProfiles } = await admin
      .from('profiles')
      .select('id,email,role')
      .in('id', targetIds);

    for (const p of targetProfiles || []) {
      targetsById[p.id] = { email: p.email, role: p.role };
    }
  }

  return {
    logs: rows,
    count: count ?? 0,
    limit,
    offset,
    action,
    q: qq,
    from,
    to,
    actions: ACTIONS,
    actorsById,
    targetsById
  };
}
