# HelpDesk Chat — frontend

React 19 + TypeScript + Vite + Tailwind v4 (Inter, blue theme, light/dark) + Zustand + Socket.IO client, for the
[chat-backend](https://github.com/aashik-karki/Chat-app-backend) (Express, Socket.IO, MongoDB, Redis, BullMQ).
Three roles: **customers** chat with support, **agents** work an inbox, **admins** see a live dashboard.

## Run locally

Start the backend first (see its README), then:

```bash
cp .env.example .env          # VITE_BACKEND_URL = where the backend runs (e.g. http://localhost:4001)
npm install
npm run dev                   # http://localhost:3000
```

In development Vite proxies `/api` and `/socket.io` to the backend, so the browser sees one origin:
the HttpOnly session cookie is first-party and CORS is not involved. For production set `VITE_API_URL`
only if the backend is on a different origin.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with the backend proxy |
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint |

To try Web Push, enable it on the backend (`npm run push:vapid` there, paste the keys into its `.env`),
then click the bell in the header.

## How each requirement is met

| Requirement | Where / how |
| --- | --- |
| **Socket.IO client, latency & reconnection** | `lib/socket.ts`: one connection, infinite jittered reconnect, typed acks (`{ ok, data \| error }` → data or `AppError`), connection state in `stores/connection.store.ts` (Live / Reconnecting / Offline pill + banner, browser offline detection). After a reconnect that couldn't replay missed events, open threads are re-fetched (`ChatRealtimeBridge`). |
| **Efficient send/receive, smooth UI** | Optimistic messages with a client id; **offline outbox** resends in order after reconnect with the same id (server dedupes → no duplicates); retry/delete on failure (`chat/services/messaging.ts`). Normalized Zustand store, memoized bubbles, scroll kept steady when older pages load, "N new messages" jump button. |
| **Typing indicator (debounce/throttle)** | `chat/hooks/useTypingEmitter.ts`: one `typing:true` per 2 s while typing (throttle), `false` after 3 s idle (debounce), volatile emits. Server also auto-clears after 6 s. |
| **Unread count, server-synced** | Counts come from the server (`conversation:updated` events + REST), never guessed on the client; read receipts only when the message is actually visible (tab visible + focused + scrolled to bottom). Tab title shows `(n)`. |
| **Presence (incl. abrupt disconnects)** | `features/presence`: ref-counted watch list → one `presence:subscribe`, re-sent after reconnect; online / "last seen …". Backend handles multi-tab, reload grace, crash sweep. Stale presence is hidden while *we* are offline. |
| **Export JSON / CSV** | `chat/components/ExportMenu.tsx`: downloads the **full** history streamed by the server (not just loaded messages). |
| **Read / delivered status** | ✓ sent · ✓✓ delivered · blue ✓✓ read; status only moves forward; a read receipt for message X marks every earlier own message read (`chat/chat.store.ts`). Per side: an agent opening a chat never marks a teammate's reply as read. |
| **Web Push** | `public/sw.js` (push, notification click → focus + route, `pushsubscriptionchange`), `features/push`: permission only on click (never on load), clear states (on / off / blocked + how to unblock / unsupported), **iPhone/iPad** → "Add to Home Screen" (push only works for installed PWAs, iOS 16.4+), manifest + icons, subscription removed on logout, **background-tab local notifications** (the server skips push while the socket is connected). |
| **Real-time metrics (admin dashboard)** | `features/admin`: live numbers over the socket every 5 s (`metrics:update`); message trends, busiest weekday and closed conversations from `GET /api/v1/metrics/analytics` in the browser's time zone (refreshed every minute); team capacity gauge and agent board update live from `agent:status`; CSV export of the daily series. Each card is its own component (`StatCard`, `MessagesCard`, `TrendChart`, `StatusSplit`, `WeekdayBars`, `CapacityGauge`, `PendingApprovals`, `DashboardCard`). |
| **Scalable state management** | Zustand, one store per concern (`auth`, `chat` normalized by id, `presence`, `agents`, `push`, `connection`, `toast`); socket events are applied in one place per feature (`*RealtimeBridge.tsx`). |
| **Error handling & feedback** | Every backend error code → a human sentence (`lib/errors.ts`); toasts with actions (Retry / Open); inline errors; CSRF auto-refresh + single retry (`lib/http.ts`). |

## Structure

```
src/
  app/            router, route guards (by role), app shell (staff: sidebar + top bar), realtime provider
  lib/            http (cookies + CSRF), socket, errors, time/id helpers, shadcn cn()
  stores/         connection, toast, theme
  components/     ui/ (app UI kit), shadcn/ (card, table, badge, button), ConnectionPill
  features/
    auth/         login, register, pending approval
    chat/         customer chat + shared ChatView, message list, composer, export
    presence/     live online/offline
    agents/       inbox (Mine / Queue / All), availability, claim / close / transfer
    admin/        live metrics tiles + chart, agent board, customer approvals
    push/         Web Push permission flow, subscription, background notifications
public/           sw.js, manifest.webmanifest, icons/
```

Real-time event reference: backend `docs/realtime-events.md`. REST API: backend `/api/docs` (Swagger).
