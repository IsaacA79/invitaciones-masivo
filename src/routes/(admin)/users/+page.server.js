// src/routes/(admin)/users/+page.server.js
import { redirect, fail } from "@sveltejs/kit";
import { writeAuditLog } from '$lib/server/repositories/auditLogs.repo.js';


const ROLES = ["admin", "capturista", "sender", "designer"];

// ✅ límites anti-abuso
const MAX_EMAIL_LEN = 254;
const MIN_PASS_LEN = 8;
const MAX_PASS_LEN = 128;

// ✅ regex razonable (no perfecto, pero fuerte)
const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeEmail(v) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

function validateEmail(email) {
  if (!email) return "Email requerido";
  if (email.length > MAX_EMAIL_LEN) return "Email demasiado largo";
  if (!EMAIL_RE.test(email)) return "Email inválido";
  return null;
}

function validatePassword(password) {
  if (!password) return "Contraseña requerida";
  if (password.length < MIN_PASS_LEN)
    return `Contraseña muy corta (mín. ${MIN_PASS_LEN})`;
  if (password.length > MAX_PASS_LEN)
    return `Contraseña demasiado larga (máx. ${MAX_PASS_LEN})`;
  return null;
}

function validateUuid(id) {
  if (!id) return "Falta id";
  if (!UUID_RE.test(id)) return "ID inválido";
  return null;
}

async function requireAdmin(locals) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, "/login");

  const role = locals.role ?? (await locals.getRole(user.id));
  if (role !== "admin") throw redirect(303, "/events");

  return { user, role };
}

async function findUserIdByEmail(supabaseAdmin, email) {
  const admin = supabaseAdmin.auth?.admin;

  // ✅ si existe getUserByEmail, úsalo
  if (admin?.getUserByEmail) {
    const { data, error } = await admin.getUserByEmail(email);
    if (error) throw error;
    return data?.user?.id ?? null;
  }

  // fallback: paginar usuarios
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;

    const u = data?.users?.find(
      (x) => (x.email || "").toLowerCase() === email.toLowerCase(),
    );
    if (u?.id) return u.id;

    if (!data?.users?.length) break;
    page++;
  }
  return null;
}

export const load = async ({ locals }) => {
  await requireAdmin(locals);

  const { data: profiles, error } = await locals.supabaseAdmin
    .from("profiles")
    .select("id,email,role,created_at")
    .order("created_at", { ascending: false });

  return { profiles: error ? [] : (profiles ?? []), roles: ROLES };
};

export const actions = {
  create: async (event) => {
    const { request, locals } = event;
    const { user } = await requireAdmin(locals);

    const fd = await request.formData();
    const email = normalizeEmail(fd.get('email'));
    const password = String(fd.get('password') || '');
    const role = String(fd.get('role') || '').trim();

    const emailErr = validateEmail(email);
    if (emailErr) return fail(400, { message: emailErr });

    const passErr = validatePassword(password);
    if (passErr) return fail(400, { message: passErr });

    if (!ROLES.includes(role)) return fail(400, { message: 'Rol inválido' });

    const adminAuth = locals.supabaseAdmin.auth.admin;

    let userId = null;
    let mode = 'direct_create';

    try {
      const { data, error } = await adminAuth.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role }
      });
      if (error) throw error;
      userId = data?.user?.id ?? null;
    } catch (err) {
      // si ya existía, actualizamos
      mode = 'direct_update_existing';
      try {
        userId = await findUserIdByEmail(locals.supabaseAdmin, email);
        if (!userId) throw err;

        const { error: upAuthErr } = await adminAuth.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { role }
        });

        if (upAuthErr) throw upAuthErr;
      } catch (e2) {
        return fail(500, { message: e2?.message || err?.message || 'No se pudo crear/actualizar el usuario' });
      }
    }

    const { error: upErr } = await locals.supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, email, role }, { onConflict: 'id' });

    if (upErr) return fail(500, { message: upErr.message });

    // ✅ AUDIT (NO guardamos contraseña)
    try {
      await writeAuditLog({
        admin: locals.supabaseAdmin,
        actor_id: user.id,
        action: 'user.create',
        target_id: userId,
        target_email: email,
        ip: event.getClientAddress?.() ?? null,
        user_agent: request.headers.get('user-agent'),
        meta: { role, mode }
      });
    } catch (e) {
      console.error('[audit] create user failed', e);
      // no frenamos el flujo por auditoría
    }

    return { ok: true };
  },

  invite: async (event) => {
    const { request, locals, url } = event;
    const { user } = await requireAdmin(locals);

    const fd = await request.formData();
    const email = normalizeEmail(fd.get('email'));
    const role = String(fd.get('role') || '').trim();

    const emailErr = validateEmail(email);
    if (emailErr) return fail(400, { message: emailErr });

    if (!ROLES.includes(role)) return fail(400, { message: 'Rol inválido' });

    let userId = null;
    let mode = 'invite';

    try {
      const { data, error } = await locals.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${url.origin}/login`,
        data: { role }
      });

      if (error) throw error;
      userId = data?.user?.id ?? null;
    } catch (err) {
      mode = 'invite_existing_lookup';
      userId = await findUserIdByEmail(locals.supabaseAdmin, email);
      if (!userId) return fail(500, { message: err?.message || 'No se pudo invitar/ubicar al usuario' });
    }

    const { error: upErr } = await locals.supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, email, role }, { onConflict: 'id' });

    if (upErr) return fail(500, { message: upErr.message });

    // ✅ AUDIT
    try {
      await writeAuditLog({
        admin: locals.supabaseAdmin,
        actor_id: user.id,
        action: 'user.invite',
        target_id: userId,
        target_email: email,
        ip: event.getClientAddress?.() ?? null,
        user_agent: request.headers.get('user-agent'),
        meta: { role, mode, redirectTo: '/login' }
      });
    } catch (e) {
      console.error('[audit] invite user failed', e);
    }

    return { ok: true };
  },

  setPassword: async (event) => {
    const { request, locals } = event;
    const { user } = await requireAdmin(locals);

    const fd = await request.formData();
    const id = String(fd.get('id') || '').trim();
    const password = String(fd.get('password') || '');

    const idErr = validateUuid(id);
    if (idErr) return fail(400, { message: idErr });

    const passErr = validatePassword(password);
    if (passErr) return fail(400, { message: passErr });

    const adminAuth = locals.supabaseAdmin.auth.admin;

    const { error } = await adminAuth.updateUserById(id, {
      password,
      email_confirm: true
    });

    if (error) return fail(500, { message: error.message });

    // obtener email para el audit (solo para lectura, no crítico)
    let targetEmail = null;
    try {
      const { data: p } = await locals.supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', id)
        .single();
      targetEmail = p?.email ?? null;
    } catch {}

    // ✅ AUDIT (NO guardamos contraseña)
    try {
      await writeAuditLog({
        admin: locals.supabaseAdmin,
        actor_id: user.id,
        action: 'user.set_password',
        target_id: id,
        target_email: targetEmail,
        ip: event.getClientAddress?.() ?? null,
        user_agent: request.headers.get('user-agent'),
        meta: { via: 'admin_panel' }
      });
    } catch (e) {
      console.error('[audit] setPassword failed', e);
    }

    return { ok: true };
  },

  setRole: async (event) => {
    const { request, locals } = event;
    const { user } = await requireAdmin(locals);

    const fd = await request.formData();
    const id = String(fd.get('id') || '').trim();
    const role = String(fd.get('role') || '').trim();

    const idErr = validateUuid(id);
    if (idErr) return fail(400, { message: idErr });

    if (!ROLES.includes(role)) return fail(400, { message: 'Rol inválido' });

    // ✅ Protección: no permitir que el admin se quite su propio rol admin
    if (id === user.id && role !== 'admin') {
      return fail(400, { message: 'No puedes cambiar tu propio rol fuera de admin.' });
    }

    // rol actual del target
    const { data: target, error: tErr } = await locals.supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', id)
      .single();

    if (tErr || !target) return fail(404, { message: 'Usuario no encontrado' });

    // ✅ Protección: no quitar admin si sería el último
    if (target.role === 'admin' && role !== 'admin') {
      const { count, error: cErr } = await locals.supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (cErr) return fail(500, { message: cErr.message });
      if ((count ?? 0) <= 1) {
        return fail(400, { message: 'No puedes quitar el rol admin al último administrador.' });
      }
    }

    const { error } = await locals.supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', id);

    if (error) return fail(500, { message: error.message });

    // ✅ AUDIT
    try {
      await writeAuditLog({
        admin: locals.supabaseAdmin,
        actor_id: user.id,
        action: 'user.set_role',
        target_id: id,
        target_email: target.email ?? null,
        ip: event.getClientAddress?.() ?? null,
        user_agent: request.headers.get('user-agent'),
        meta: { from: target.role, to: role }
      });
    } catch (e) {
      console.error('[audit] setRole failed', e);
    }

    return { ok: true };
  }
};

