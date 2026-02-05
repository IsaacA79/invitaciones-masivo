import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private'

const url = (SUPABASE_URL || '').trim()
const key = ( SUPABASE_ANON_KEY || '').trim()

if (process.env.NODE_ENV !== 'production') {
  const mask = s => (s ? `${s.slice(0, 6)}…${s.slice(-6)}` : '')
  console.log('[SUPABASE] URL =', url)
  console.log('[SUPABASE] KEY =', mask(key), 'len=', key.length)
}

const supabase = createClient(url, key)
export default supabase
