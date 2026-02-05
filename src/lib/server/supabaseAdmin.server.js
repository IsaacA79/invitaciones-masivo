// src/lib/server/supabaseAdmin.server.js
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const SUPABASE_URL = env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL; // usa el que tengas
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('Falta SUPABASE_URL (o PUBLIC_SUPABASE_URL) en entorno');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en entorno');

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
});
