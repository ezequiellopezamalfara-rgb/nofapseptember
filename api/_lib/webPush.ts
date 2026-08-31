import webPush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

let configured = false

function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT en el entorno.')
  }
  webPush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

interface Subscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/** Manda el payload a cada subscription; borra las que ya no son válidas (404/410). */
export async function sendToSubscriptions(
  admin: SupabaseClient,
  subscriptions: Subscription[],
  payload: Record<string, unknown>,
): Promise<void> {
  ensureConfigured()

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }),
  )
}
