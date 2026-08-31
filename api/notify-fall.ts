import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendToSubscriptions } from './_lib/webPush.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { userId, userName, streakLost } = req.body ?? {}
  if (typeof userId !== 'string' || typeof userName !== 'string') {
    res.status(400).json({ error: 'userId y userName son requeridos' })
    return
  }

  const admin = supabaseAdmin()

  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .neq('user_id', userId)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  await sendToSubscriptions(admin, subscriptions ?? [], {
    title: `${userName} cayó en combate`,
    body:
      typeof streakLost === 'number' && streakLost > 0
        ? `Perdió una racha de ${streakLost} día${streakLost === 1 ? '' : 's'}.`
        : 'El pelotón sigue de pie.',
  })

  res.status(200).json({ sent: subscriptions?.length ?? 0 })
}
