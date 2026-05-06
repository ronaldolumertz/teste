import { supabase } from './supabase'

const VAPID_PUBLIC = __VAPID_PUBLIC_KEY__

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function subscribePush(profileId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }

  const subJson = sub.toJSON()
  await supabase.from('push_subscriptions').upsert({
    profile_id: profileId,
    endpoint:   subJson.endpoint,
    p256dh:     subJson.keys.p256dh,
    auth:       subJson.keys.auth,
  }, { onConflict: 'profile_id,endpoint' })

  return sub
}

export async function unsubscribePush(profileId) {
  const reg = await navigator.serviceWorker?.ready
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete()
      .eq('profile_id', profileId).eq('endpoint', endpoint)
  }
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}
