import { http } from '../../lib/http'

export const pushApi = {
  publicKey: () => http.get<{ publicKey: string }>('/api/v1/push/public-key').then((result) => result.publicKey),
  subscribe: (subscription: PushSubscriptionJSON) => http.post<{ subscribed: true }>('/api/v1/push/subscriptions', subscription),
  unsubscribe: (endpoint: string) => http.delete<null>('/api/v1/push/subscriptions', { endpoint }),
}
