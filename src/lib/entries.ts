import { supabase } from './supabase'
import type { EntryStatus } from './scoring'
import type { ObjectiveKey } from './objectives'

/** Guarda daily_entries + entry_objectives en una sola operación atómica (ver confirm_check_in en supabase/schema.sql). */
export async function confirmCheckIn(
  date: string,
  status: EntryStatus,
  objectives: Partial<Record<ObjectiveKey, boolean>>,
): Promise<void> {
  const { error } = await supabase.rpc('confirm_check_in', {
    p_date: date,
    p_status: status,
    p_objectives: objectives,
  })
  if (error) throw error
}
