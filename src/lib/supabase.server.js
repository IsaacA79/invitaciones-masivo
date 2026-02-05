// src/lib/supabaseClient.js (recomendado)
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const url = (PUBLIC_SUPABASE_URL || '').trim();
const key = (PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!url) throw new Error('Falta PUBLIC_SUPABASE_URL');
if (!key) throw new Error('Falta PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(url, key);
