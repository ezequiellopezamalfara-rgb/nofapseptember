import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendToSubscriptions } from './_lib/webPush.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { authorId, message } = req.body ?? {}
  if (typeof authorId !== 'string' || typeof message !== 'string') {
    res.status(400).json({ error: 'authorId y message son requeridos' })
    return
  }

  const admin = supabaseAdmin()

  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .neq('user_id', authorId)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  await sendToSubscriptions(admin, subscriptions ?? [], {
    title: 'Comunicado del mando',
    body: message.length > 140 ? `${message.slice(0, 140)}…` : message,
  })

  res.status(200).json({ sent: subscriptions?.length ?? 0 })
}
