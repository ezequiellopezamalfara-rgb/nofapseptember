import { supabase } from './supabase'

export interface PublicUser {
  id: string
  name: string
}

export async function nameExists(name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('public_users')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

/**
 * Crea el usuario (nombre nuevo) o reclama uno existente (PIN correcto) y
 * vincula este dispositivo (auth.uid() de la sesión anónima) a esa fila.
 * pin_hash nunca viaja al cliente: todo el hasheo/comparación pasa server-side
 * dentro de claim_user() (ver supabase/schema.sql).
 */
export async function claimUser(name: string, pin: string): Promise<PublicUser> {
  const { data, error } = await supabase.rpc('claim_user', { p_name: name, p_pin: pin })
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('claim_user no devolvió resultado')
  return { id: row.id, name: row.name }
}
