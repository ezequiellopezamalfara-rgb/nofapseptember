import { supabase } from './supabase'
import type { EntryStatus, RawEntry } from './scoring'
import type { ObjectiveKey } from './objectives'
import type { PublicUser } from './users'

export interface UserWithEntries {
  user: PublicUser
  entries: RawEntry[]
}

interface EntryRow {
  user_id: string
  date: string
  status: EntryStatus
  reported_at: string
  entry_objectives: { objective_key: ObjectiveKey; completed: boolean }[]
}

/**
 * Todo lo que necesitan Ranking/Feed/Perfil: cada usuario con sus entradas
 * crudas. El puntaje se recalcula acá en cliente vía scoring.ts, nunca se
 * lee de la base — el volumen (10 usuarios × 30 días) lo hace trivial.
 */
export async function fetchAllUsersWithEntries(): Promise<UserWithEntries[]> {
  const [{ data: users, error: usersError }, { data: entryRows, error: entriesError }] =
    await Promise.all([
      supabase.from('public_users').select('*').order('created_at'),
      supabase
        .from('daily_entries')
        .select('user_id, date, status, reported_at, entry_objectives(objective_key, completed)')
        .order('date'),
    ])

  if (usersError) throw usersError
  if (entriesError) throw entriesError

  const entriesByUser = new Map<string, RawEntry[]>()
  for (const row of entryRows as EntryRow[]) {
    const list = entriesByUser.get(row.user_id) ?? []
    list.push({
      date: row.date,
      status: row.status,
      objectives: Object.fromEntries(
        row.entry_objectives.map((o) => [o.objective_key, o.completed]),
      ),
    })
    entriesByUser.set(row.user_id, list)
  }

  return (users as PublicUser[]).map((user) => ({
    user,
    entries: entriesByUser.get(user.id) ?? [],
  }))
}
