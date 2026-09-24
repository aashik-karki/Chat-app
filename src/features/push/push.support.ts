/**
 * What this browser can do with Web Push.
 *  - iPhone/iPad (iOS 16.4+) only allow push for web apps ADDED TO THE HOME SCREEN.
 *  - Push needs a secure context (https, or http://localhost in development).
 */
export type PushSupport = 'supported' | 'unsupported' | 'insecure' | 'ios-needs-install'

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS reports "Mac"

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export const detectPushSupport = (): PushSupport => {
  if (!window.isSecureContext) return 'insecure'
  if (isIOS() && !isStandalone()) return 'ios-needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'supported'
}

export const currentPermission = (): NotificationPermission => ('Notification' in window ? Notification.permission : 'default')

/** VAPID keys are base64url; pushManager.subscribe() wants bytes. */
export const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replaceAll('-', '+').replaceAll('_', '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}
