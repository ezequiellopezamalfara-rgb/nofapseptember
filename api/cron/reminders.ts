import type { VercelRequest, VercelResponse } from '@vercel/node'
import { EVENING_LINES, MORNING_LINES, randomLine } from '../_lib/reminderLines.js'
import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { sendToSubscriptions } from '../_lib/webPush.js'
import { scoreChallenge, type RawEntry } from '../../src/lib/scoring.js'

interface EntryRow {
  user_id: string
  date: string
  status: 'en_pie' | 'caido'
  entry_objectives: { objective_key: string; completed: boolean }[]
}

interface UserRow {
  id: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const now = new Date()
  const admin = supabaseAdmin()

  const [{ data: users, error: usersError }, { data: entryRows, error: entriesError }] =
    await Promise.all([
      admin.from('users').select('id'),
      admin
        .from('daily_entries')
        .select('user_id, date, status, entry_objectives(objective_key, completed)'),
    ])

  if (usersError || entriesError) {
    res.status(500).json({ error: (usersError ?? entriesError)!.message })
    return
  }

  const entriesByUser = new Map<string, RawEntry[]>()
  for (const row of entryRows as EntryRow[]) {
    const list = entriesByUser.get(row.user_id) ?? []
    list.push({
      date: row.date,
      status: row.status,
      objectives: Object.fromEntries(row.entry_objectives.map((o) => [o.objective_key, o.completed])),
    })
    entriesByUser.set(row.user_id, list)
  }

  const pendingUserIds = (users as UserRow[])
    .filter((u) => {
      const { days } = scoreChallenge(entriesByUser.get(u.id) ?? [], now)
      return days[days.length - 1]?.pending
    })
    .map((u) => u.id)

  if (pendingUserIds.length === 0) {
    res.status(200).json({ sent: 0 })
    return
  }

  const { data: subscriptions, error: subsError } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', pendingUserIds)

  if (subsError) {
    res.status(500).json({ error: subsError.message })
    return
  }

  // AR es UTC-3 fijo: hora AR = hora UTC - 3.
  const arHour = (now.getUTCHours() + 21) % 24
  const isEvening = arHour >= 15

  await sendToSubscriptions(admin, subscriptions ?? [], {
    title: isEvening ? 'Quedan menos de 3 horas' : 'Reportá el día de ayer',
    body: randomLine(isEvening ? EVENING_LINES : MORNING_LINES),
  })

  res.status(200).json({ sent: subscriptions?.length ?? 0, pendingUsers: pendingUserIds.length })
}
