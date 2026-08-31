import { createClient } from '@supabase/supabase-js'

export function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Faltan VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  }
  return createClient(url, key)
}
