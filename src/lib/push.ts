import { supabase } from './supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/** iOS solo permite Web Push si la PWA está agregada a la pantalla de inicio (16.4+). */
export function isIosSafariNotInstalled(): boolean {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return isIos && !isStandalone
}

export type SubscribeResult = 'subscribed' | 'unsupported' | 'denied' | 'ios-not-installed'

export async function subscribeToPush(userId: string): Promise<SubscribeResult> {
  if (isIosSafariNotInstalled()) return 'ios-not-installed'
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY) as BufferSource,
  })

  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error

  return 'subscribed'
}
