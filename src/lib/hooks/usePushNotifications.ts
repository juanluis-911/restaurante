'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type PushContext =
  | { type: 'restaurant'; id: string }
  | { type: 'driver';     id: string }
  | { type: 'order';      id: string }

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buf
}

export function usePushNotifications(context: PushContext) {
  const [isSupported,  setIsSupported]  = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default')
  const autoSubDone = useRef(false)

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setIsSupported(supported)
    if (supported) setPermissionState(Notification.permission)
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const permission = await Notification.requestPermission()
      setPermissionState(permission)
      if (permission !== 'granted') return false

      const registration = await navigator.serviceWorker.ready

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      const raw = pushSubscription.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: raw.endpoint,
            keys: { p256dh: raw.keys?.p256dh, auth: raw.keys?.auth },
          },
          context,
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
        return true
      }
      return false
    } catch (err) {
      console.error('[usePushNotifications] subscribe error:', err)
      return false
    }
  }, [isSupported, context])

  // Verificar si ya hay una suscripción activa en el browser
  useEffect(() => {
    if (!isSupported) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [isSupported])

  // Auto-suscribir silenciosamente si el permiso ya fue otorgado antes
  useEffect(() => {
    if (!isSupported || autoSubDone.current) return
    if (Notification.permission !== 'granted') return
    autoSubDone.current = true
    subscribe()
  }, [isSupported, subscribe])

  return { isSupported, isSubscribed, permissionState, subscribe }
}
