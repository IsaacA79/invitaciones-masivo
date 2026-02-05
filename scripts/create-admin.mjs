import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error('Falta SUPABASE_URL o PUBLIC_SUPABASE_URL en .env');
if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env');

const email = String(process.argv[2] || '').trim().toLowerCase();
const password = String(process.argv[3] || '');

if (!email || !password) {
  console.log('Uso: node scripts/create-admin.mjs <email> <password>');
  process.exit(1);
}

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Busca userId por email (con fallback a listUsers)
async function findUserIdByEmail(email) {
  const admin = supabaseAdmin.auth.admin;

  // Algunos builds traen getUserByEmail:
  if (typeof admin.getUserByEmail === 'function') {
    const { data, error } = await admin.getUserByEmail(email);
    if (error) throw error;
    return data?.user?.id ?? null;
  }

  // Fallback: paginar listUsers
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;

    const u = data?.users?.find((x) => (x.email || '').toLowerCase() === email);
    if (u?.id) return u.id;

    if (!data?.users?.length) break;
    page++;
  }

  return null;
}

let userId = await findUserIdByEmail(email);

if (userId) {
  // ✅ Cambia password directo (admin)
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true
  });
  if (error) throw error;
  console.log('✅ Password actualizado para:', email);
} else {
  // ✅ Crea user si no existe
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) throw error;

  userId = data.user.id;
  console.log('✅ Admin creado:', email);
}

// ✅ Asegura profiles como admin (incluye email por si tu tabla lo tiene)
const { error: profErr } = await supabaseAdmin
  .from('profiles')
  .upsert({ id: userId, email, role: 'admin' }, { onConflict: 'id' });

if (profErr) throw profErr;

console.log('User ID:', userId);
// node scripts/create-admin.mjs admin@tudominio.com "NuevaClaveSegura123!"
