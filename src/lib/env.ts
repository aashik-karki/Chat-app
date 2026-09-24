/** Base URL for REST + Socket.IO. Empty = same origin (dev proxy / same-host deployment). */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
