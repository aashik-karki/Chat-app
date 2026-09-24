import { AppError, toAppError } from '../../lib/errors'
import { toast } from '../../stores/toast.store'
import { pushApi } from './push.api'
import { usePushStore } from './push.store'
import { currentPermission, detectPushSupport, urlBase64ToUint8Array } from './push.support'

const store = () => usePushStore.getState()

/** Registers the service worker once at startup (also needed for notification clicks). */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

const readyRegistration = async () => {
  await registerServiceWorker()
  return navigator.serviceWorker.ready
}

const keysMatch = (subscription: PushSubscription, key: Uint8Array) => {
  const current = subscription.options.applicationServerKey
  if (!current) return false
  const bytes = new Uint8Array(current)
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index])
}

/** Reads the real browser state into the store (permission can change in browser settings at any time). */
export const refreshPushState = async () => {
  const support = detectPushSupport()
  const permission = currentPermission()
  let subscribed = false
  if (support === 'supported' && permission === 'granted') {
    const registration = await navigator.serviceWorker.getRegistration('/')
    subscribed = Boolean(await registration?.pushManager.getSubscription())
  }
  store().set({ support, permission, subscribed })
}

/**
 * Turn notifications on. MUST be called from a click: browsers (Safari especially)
 * only show the permission prompt during a user gesture, so we ask first, before any await.
 */
export const enablePush = async () => {
  if (store().support !== 'supported') return
  store().set({ busy: true, serverError: null })
  try {
    const permission = await Notification.requestPermission()
    store().set({ permission })
    if (permission !== 'granted') {
      if (permission === 'denied') toast.error('Notifications are blocked. You can allow them in your browser’s site settings.')
      return
    }

    const [registration, publicKey] = await Promise.all([readyRegistration(), pushApi.publicKey()])
    const key = urlBase64ToUint8Array(publicKey)

    let subscription = await registration.pushManager.getSubscription()
    if (subscription && !keysMatch(subscription, key)) {
      await subscription.unsubscribe() // server keys changed → old subscription is useless
      subscription = null
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })

    await pushApi.subscribe(subscription.toJSON())
    store().set({ subscribed: true })
    toast.success('Notifications are on for this browser.')
  } catch (error) {
    const appError = error instanceof AppError ? error : null
    if (appError?.code === 'PUSH_DISABLED') store().set({ serverError: appError.message })
    toast.error(appError ? appError.message : 'Could not turn on notifications in this browser. Please try again.')
  } finally {
    store().set({ busy: false })
  }
}

/** Turn notifications off for this browser (server first, then the browser). */
export const disablePush = async ({ quiet = false } = {}) => {
  store().set({ busy: true })
  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      await pushApi.unsubscribe(subscription.endpoint).catch(() => undefined)
      await subscription.unsubscribe()
    }
    store().set({ subscribed: false })
    if (!quiet) toast.info('Notifications are off for this browser.')
  } catch (error) {
    if (!quiet) toast.error(toAppError(error).message)
  } finally {
    store().set({ busy: false })
  }
}

/**
 * After login: if this browser already has a subscription, attach it to the account
 * that just signed in (the server upserts by endpoint).
 */
export const syncPushAfterLogin = async () => {
  await refreshPushState()
  if (!store().subscribed) return
  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) await pushApi.subscribe(subscription.toJSON())
  } catch {
    /* best effort */
  }
}
