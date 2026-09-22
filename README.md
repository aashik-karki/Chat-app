# Orbit chat

A responsive React chat client with Socket.IO transport, optimistic messages, delivery/read receipts, typing signals, presence, JSON/CSV export, and Web Push registration.

## Run locally

```bash
npm install
npm run dev
```

Without configuration it runs as an interactive local demo. Set the variables below to attach a Socket.IO server:

```bash
VITE_SOCKET_URL=https://chat.example.com
VITE_SOCKET_TOKEN=your-session-token
VITE_VAPID_PUBLIC_KEY=your-url-safe-base64-vapid-public-key
```

`VITE_VAPID_PUBLIC_KEY` is only required when enabling background Web Push. The service worker is served from `public/sw.js`.

## Realtime contract

Authentication is sent in the Socket.IO `auth` object. The client emits:

| Event | Payload | Purpose |
| --- | --- | --- |
| `conversation:join` | `{ conversationId }` | Subscribe to a conversation |
| `message:send` | `{ clientId, conversationId, text }` | Send an idempotent message; acknowledge with message metadata |
| `message:read` | `{ conversationId, lastMessageId }` | Atomically advance the reader’s cursor |
| `typing:set` | `{ conversationId, isTyping }` | Ephemeral, volatile typing state |
| `push:subscribe` | PushSubscription JSON | Store/update a browser subscription |

It listens for `message:new`, `message:status`, `presence:update`, `typing:update`, and `conversation:unread`. A server should deduplicate `message:send` by `clientId`, persist receipts transactionally, calculate unread totals as the authority, and broadcast updated presence/receipts to every participant.

## Reliability notes

- Messages render optimistically and are retried after reconnect with their original client ID.
- The Socket.IO client uses websocket first, polling fallback, jittered reconnects, and acknowledgement timeouts.
- Read receipts are idempotent and queued while offline.
- Typing emits at most one start signal per typing burst and a debounced stop after 1.2 seconds.
- Web Push uses the standard permission flow and surfaces configuration/permission failures in the UI.
