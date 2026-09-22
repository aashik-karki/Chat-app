import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive, Bell, BellRing, Check, CheckCheck, ChevronDown, CircleAlert, Download,
  FileJson, FileSpreadsheet, Info, Menu, MoreHorizontal, Paperclip, Search,
  SendHorizontal, Settings2, ShieldCheck, Smile, WifiOff, X,
} from 'lucide-react'
import { avatarColorClass } from '../lib/avatarColor'
import { CURRENT_USER_ID } from '../data/demoChat'
import { chatSocket } from '../lib/socket'
import { useRealtime } from '../hooks/useRealtime'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import type { ChatMessage, Conversation, MessageStatus, PresenceState } from '../types/chat'

const displayTime = (value: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const EMPTY_TYPING_USERS: string[] = []

// Shared avatar/presence-dot styling so every avatar size below only needs
// to add its own dimensions + the per-user color class.
const avatarBase = 'relative grid shrink-0 place-items-center rounded-full font-sans font-semibold tracking-[-0.3px] text-white'
const presenceDot = (presence: PresenceState, border: 'sidebar' | 'panel' = 'sidebar') =>
  `absolute -right-px bottom-0 h-[9px] w-[9px] rounded-full border-2 ${border === 'sidebar' ? 'border-[#fafafc]' : 'border-[#fcfcfd]'} ${
    presence === 'online' ? 'bg-[#4bb78a]' : presence === 'away' ? 'bg-[#eab050]' : 'bg-[#a7a3ab]'
  }`

function messageStatus(status: MessageStatus) {
  if (status === 'read') return <CheckCheck size={15} aria-label="Read" />
  if (status === 'delivered') return <CheckCheck size={15} aria-label="Delivered" />
  if (status === 'sent') return <Check size={15} aria-label="Sent" />
  if (status === 'failed') return <CircleAlert size={15} aria-label="Failed to send" />
  return <span className="block h-[7px] w-[7px] animate-spin rounded-full border-[1.5px] border-[#d7cffb] border-t-transparent" aria-label="Sending" />
}

function presenceLabel(conversation: Conversation) {
  const { presence, lastSeen } = conversation.user
  if (presence === 'online') return 'Active now'
  if (presence === 'away') return 'Away'
  return lastSeen ?? 'Offline'
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function exportMessages(conversation: Conversation, messages: ChatMessage[], format: 'json' | 'csv') {
  const fileBase = `${conversation.user.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-chat-history`
  const content = format === 'json'
    ? JSON.stringify({ exportedAt: new Date().toISOString(), conversation: conversation.user.name, messages }, null, 2)
    : [
      'id,sender,message,timestamp,status,delivered_at,read_at',
      ...messages.map((message) => [message.id, message.senderId === CURRENT_USER_ID ? 'You' : conversation.user.name, message.text, message.createdAt, message.status, message.deliveredAt ?? '', message.readAt ?? ''].map(csvCell).join(',')),
    ].join('\n')
  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = `${fileBase}.${format}`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 0)
}

function base64ToUint8Array(base64: string) {
  const padded = `${base64}${'='.repeat((4 - base64.length % 4) % 4)}`.replaceAll('-', '+').replaceAll('_', '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

/**
 * The main chat experience at "/". Reachable only through the
 * `RequireApprovedUser` route guard, so it can assume an authenticated,
 * approved user is already in the store.
 */
export function ChatPage() {
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const conversations = useChatStore((state) => state.conversations)
  const messagesByConversation = useChatStore((state) => state.messages)
  const activeConversationId = useChatStore((state) => state.activeConversationId)
  const connection = useChatStore((state) => state.connection)
  const reconnectAttempt = useChatStore((state) => state.reconnectAttempt)
  const typingUsers = useChatStore((state) => state.typingByConversation[state.activeConversationId] ?? EMPTY_TYPING_USERS)
  const error = useChatStore((state) => state.error)
  const notificationPermission = useChatStore((state) => state.notificationPermission)
  const setActiveConversation = useChatStore((state) => state.setActiveConversation)
  const setError = useChatStore((state) => state.setError)
  const setNotificationPermission = useChatStore((state) => state.setNotificationPermission)
  const { sendMessage, retryMessage, notifyTyping, markRead, subscribe } = useRealtime(true)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const messageEnd = useRef<HTMLDivElement>(null)
  const textArea = useRef<HTMLTextAreaElement>(null)

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0]
  const messages = useMemo(() => messagesByConversation[activeConversation.id] ?? [], [activeConversation.id, messagesByConversation])
  const isDemo = !import.meta.env.VITE_SOCKET_URL
  const filteredConversations = useMemo(() => {
    const filter = query.trim().toLowerCase()
    if (!filter) return conversations
    return conversations.filter((conversation) => conversation.user.name.toLowerCase().includes(filter) || conversation.lastMessagePreview.toLowerCase().includes(filter))
  }, [conversations, query])

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversationId, messages.length, typingUsers.length])

  useEffect(() => {
    subscribe(activeConversationId)
    const newestIncoming = [...messages].reverse().find((message) => message.senderId !== CURRENT_USER_ID)
    if (newestIncoming) markRead(activeConversationId, newestIncoming.id)
  }, [activeConversationId, markRead, messages, subscribe])

  const changeConversation = (conversationId: string) => {
    setActiveConversation(conversationId)
    setDraft('')
    setMobileMenuOpen(false)
  }

  const submitMessage = () => {
    if (!draft.trim()) return
    sendMessage(activeConversation.id, draft)
    setDraft('')
    textArea.current?.focus()
  }

  const onComposeKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitMessage()
    }
  }

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setError('This browser does not support web notifications.')
      setNotificationPermission('unsupported')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission !== 'granted') {
        setError('Notifications are off. You can enable them later from your browser settings.')
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!vapidKey) {
        setError('Notifications are enabled. Add VITE_VAPID_PUBLIC_KEY to activate background push delivery.')
        return
      }
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(vapidKey) })
      chatSocket.registerPushSubscription(subscription.toJSON())
    } catch {
      setError('We couldn’t activate notifications. Please check your browser permission settings and try again.')
    }
  }

  const connectionText = isDemo ? 'Demo mode' : connection === 'connected' ? 'Live' : connection === 'reconnecting' ? `Reconnecting · ${reconnectAttempt}` : 'Offline'
  const connectionPillClass = connection === 'connected'
    ? 'bg-[#ebf8f1] text-[#358563]'
    : connection === 'reconnecting'
      ? 'bg-[#fff7e8] text-[#ba7920]'
      : 'bg-[#f3f2f5] text-[#8a8491]'
  const connectionDotClass = connection === 'connected' ? 'bg-[#4bb78a]' : connection === 'reconnecting' ? 'bg-[#eab050]' : 'bg-[#b2adb8]'

  return (
    <main className="grid min-h-svh overflow-hidden bg-[#fcfcfd] font-sans text-[#2c2935] [grid-template-columns:300px_minmax(440px,1fr)_277px] max-[1060px]:[grid-template-columns:270px_minmax(420px,1fr)] max-[720px]:block">
      <aside
        className={`flex min-h-svh flex-col border-r border-[#e9e8ed] bg-[#fafafc] max-[720px]:fixed max-[720px]:z-10 max-[720px]:w-[min(302px,88vw)] max-[720px]:shadow-[18px_0_35px_rgba(35,25,55,.12)] max-[720px]:transition-transform max-[720px]:duration-200 max-[720px]:ease-out ${mobileMenuOpen ? 'max-[720px]:translate-x-0' : 'max-[720px]:-translate-x-[102%]'}`}
        aria-label="Conversations"
      >
        <div className="flex h-[72px] items-center gap-[10px] px-6 font-sans text-[20px] font-bold leading-none tracking-[-0.8px] text-[#332e40]">
          <div aria-hidden="true" className="relative h-6 w-6 -rotate-[7deg] rounded-tl-[9px] rounded-tr-[9px] rounded-br-[9px] rounded-bl-[2px] bg-orbit shadow-[inset_-5px_-4px_0_#a99cf1]">
            <span className="absolute left-[10px] top-2 h-[5px] w-[5px] rounded-full bg-white" />
          </div>
          <span>orbit</span>
          <button
            className="ml-auto hidden place-items-center border-0 bg-transparent p-1 text-[#77717e] max-[720px]:grid"
            type="button"
            aria-label="Close conversations"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="grid h-[66px] items-center gap-2.5 border-y border-[#ecebf0] px-[19px] text-[#312d3a] [grid-template-columns:31px_1fr_15px]">
          <div className={`${avatarBase} h-[31px] w-[31px] bg-[#242334] text-[10px]`}>AR</div>
          <div>
            <strong className="block overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[12px]/[16px] font-semibold">Atlas Research</strong>
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[10px]/[14px] text-[#9c98a5]">Product workspace</span>
          </div>
          <ChevronDown size={16} />
        </div>

        <div className="min-h-0 flex-1 px-3 pb-[10px] pt-[25px]">
          <div className="flex items-center justify-between px-2 pb-[11px] font-sans text-[11px] font-bold uppercase tracking-[.7px] text-[#56515e]">
            <span>Messages</span>
            <button type="button" className="grid place-items-center rounded-[7px] border-0 bg-transparent p-[2px] text-[#817b8c] transition-colors hover:bg-[#f0eef5] hover:text-[#453d54]" aria-label="Message settings">
              <Settings2 size={16} />
            </button>
          </div>
          <label className="mb-[14px] flex h-9 items-center gap-[7px] rounded-lg border border-[#e6e4e9] bg-white px-[9px] text-[#a6a1ad] focus-within:border-[#9c8de6] focus-within:shadow-[0_0_0_3px_rgba(120,99,219,.09)]">
            <Search size={16} />
            <input
              className="w-full min-w-0 border-0 bg-transparent text-[11px] text-[#47414e] outline-none placeholder:text-[#aaa5b0]"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages"
              aria-label="Search messages"
            />
            <kbd className="font-mono text-[9px] text-[#9d98a5]">⌘ K</kbd>
          </label>
          <div className="flex max-h-[calc(100svh-294px)] flex-col gap-[2px] overflow-y-auto [scrollbar-width:thin]">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={`grid w-full items-center gap-[9px] rounded-lg border-0 bg-transparent px-2 py-[9px] text-left text-[#302c38] transition-colors hover:bg-[#f2f0f5] [grid-template-columns:34px_minmax(0,1fr)_auto] ${conversation.id === activeConversation.id ? 'bg-orbit-soft hover:bg-orbit-soft' : ''}`}
                onClick={() => changeConversation(conversation.id)}
              >
                <div className={`${avatarBase} h-[34px] w-[34px] text-[10px] ${avatarColorClass(conversation.user.id)}`}>
                  {conversation.user.initials}
                  <i className={presenceDot(conversation.user.presence)} />
                </div>
                <span className="block overflow-hidden">
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[12px]/[17px] font-semibold text-[#3b3542]">{conversation.user.name}</span>
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[10.5px]/[15px] text-[#9b96a1]">{conversation.lastMessagePreview}</span>
                </span>
                <span className="flex flex-col items-end gap-[6px] self-start font-sans text-[9px]/[14px] text-[#aaa5b0]">
                  <span>{conversation.lastMessageAt}</span>
                  {conversation.unreadCount > 0 && (
                    <b className="grid h-[17px] min-w-[17px] place-items-center rounded-[20px] bg-orbit px-1 font-sans text-[9px] font-bold text-white">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </b>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#ecebf0] p-3">
          <button
            className="flex w-full items-center gap-[9px] rounded-[9px] border border-[#e7e4ee] bg-white p-[9px] text-left text-[#413b49] hover:border-[#cfc6ed] hover:bg-[#fdfcff]"
            type="button"
            onClick={() => void enableNotifications()}
          >
            <span className="grid h-[27px] w-[27px] place-items-center rounded-[7px] bg-[#eeebfb] text-[#725ed3]">
              {notificationPermission === 'granted' ? <BellRing size={16} /> : <Bell size={16} />}
            </span>
            <span>
              <strong className="block font-sans text-[10px]/[14px] font-semibold">{notificationPermission === 'granted' ? 'Notifications on' : 'Stay in the loop'}</strong>
              <small className="block font-sans text-[9px]/[13px] text-[#9994a0]">{notificationPermission === 'granted' ? 'Background alerts enabled' : 'Enable desktop alerts'}</small>
            </span>
          </button>
          {authUser?.role === 'admin' && (
            <Link
              className="mt-2 flex w-full items-center gap-[9px] rounded-[9px] border border-[#e7e4ee] bg-white p-[9px] text-left text-[#413b49] no-underline hover:border-[#cfc6ed] hover:bg-[#fdfcff]"
              to="/admin"
            >
              <span className="grid h-[27px] w-[27px] place-items-center rounded-[7px] bg-[#eeebfb] text-[#725ed3]">
                <ShieldCheck size={16} />
              </span>
              <span>
                <strong className="block font-sans text-[10px]/[14px] font-semibold">Admin dashboard</strong>
                <small className="block font-sans text-[9px]/[13px] text-[#9994a0]">Review pending accounts</small>
              </span>
            </Link>
          )}
          <div className="mt-[13px] flex items-center gap-2">
            <div className={`${avatarBase} h-7 w-7 bg-[#4a4861] text-[10px]`}>{authUser?.name.slice(0, 2).toUpperCase()}</div>
            <span className="min-w-0 flex-1">
              <strong className="block font-sans text-[10px]/[13px] font-semibold text-[#49434f]">{authUser?.name}</strong>
              <small className="block font-sans text-[8px]/[12px] text-[#a39eaa]">{authUser?.email}</small>
            </span>
            <button className="grid place-items-center rounded-[7px] border-0 bg-transparent p-[6px] text-[#817b8c] transition-colors hover:bg-[#f0eef5] hover:text-[#453d54]" type="button" aria-label="Sign out" onClick={() => void logout()}>
              <X size={18} />
            </button>
          </div>
        </div>
      </aside>

      <section className="flex h-svh min-w-0 flex-col bg-white">
        <header className="flex h-[72px] items-center border-b border-[#edecf0] px-7 max-[720px]:h-[62px] max-[720px]:px-[15px]">
          <button
            className="mr-[10px] hidden place-items-center border-0 bg-transparent p-1 text-[#716a79] max-[720px]:grid"
            type="button"
            aria-label="Open conversations"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className={`${avatarBase} h-[35px] w-[35px] text-[10px] max-[720px]:h-8 max-[720px]:w-8 ${avatarColorClass(activeConversation.user.id)}`}>
            {activeConversation.user.initials}
            <i className={presenceDot(activeConversation.user.presence)} />
          </div>
          <div className="ml-[10px]">
            <h1 className="m-0 font-sans text-[14px]/[18px] font-bold tracking-[-0.35px] text-[#302b37]">{activeConversation.user.name}</h1>
            <span className="flex items-center gap-[5px] font-sans text-[10px]/[15px] text-[#99939f]">
              <i className={`h-[5px] w-[5px] rounded-full ${activeConversation.user.presence === 'online' ? 'bg-[#4bb78a]' : activeConversation.user.presence === 'away' ? 'bg-[#eab050]' : 'bg-[#aaa]'}`} />
              {presenceLabel(activeConversation)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 max-[720px]:gap-[2px]">
            <span
              className={`mr-[5px] flex items-center gap-[5px] rounded-[20px] px-2 py-[5px] font-sans text-[9px] font-semibold max-[720px]:mr-0 ${connectionPillClass}`}
              title={isDemo ? 'Set VITE_SOCKET_URL to connect a Socket.IO server' : connectionText}
            >
              <i className={`h-[6px] w-[6px] rounded-full ${connectionDotClass}`} />
              {connectionText}
            </span>
            <button className="grid place-items-center rounded-[7px] border-0 bg-transparent p-[6px] text-[#817b8c] transition-colors hover:bg-[#f0eef5] hover:text-[#453d54] max-[720px]:hidden" type="button" aria-label="Conversation information">
              <Info size={19} />
            </button>
            <button className="grid place-items-center rounded-[7px] border-0 bg-transparent p-[6px] text-[#817b8c] transition-colors hover:bg-[#f0eef5] hover:text-[#453d54] max-[720px]:hidden" type="button" aria-label="More conversation options">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:#dedbe5_transparent] [scrollbar-width:thin]">
          <div className="mb-[15px] mt-6 flex flex-col items-center text-[#aaa5af] max-[720px]:mt-[17px]">
            <span className="rounded-[20px] border border-[#eeedf0] bg-[#fcfcfd] px-[10px] py-1 font-sans text-[9px] font-medium text-[#948e9b]">Today</span>
            <p className="mt-2 font-sans text-[9.5px]/[14px]">Messages are protected with end-to-end delivery tracking.</p>
          </div>
          <div className="mx-auto max-w-[725px] px-[30px] pb-7 max-[720px]:px-[15px] max-[720px]:pb-[18px]" aria-live="polite">
            {messages.map((message, index) => {
              const own = message.senderId === CURRENT_USER_ID
              const prior = messages[index - 1]
              const grouped = prior?.senderId === message.senderId
              return (
                <article key={message.id} className={`mt-[15px] flex items-end gap-2 ${grouped ? 'mt-[3px]' : ''} ${own ? 'justify-end' : ''}`}>
                  {!own && !grouped && (
                    <div className={`${avatarBase} mb-px h-[25px] w-[25px] text-[8px] ${avatarColorClass(activeConversation.user.id)}`}>{activeConversation.user.initials}</div>
                  )}
                  {!own && grouped && <div className="w-[25px] shrink-0" />}
                  <div className="max-w-[min(78%,520px)] max-[720px]:max-w-[85%]">
                    {!own && !grouped && (
                      <div className="mb-1 ml-[2px] flex items-baseline gap-1.5 font-sans text-[10px] font-semibold text-[#4b4551]">
                        {activeConversation.user.name}
                        <time className="font-sans text-[8.5px] font-normal text-[#b1acb6]">{displayTime(message.createdAt)}</time>
                      </div>
                    )}
                    <div
                      className={`relative rounded-[3px_12px_12px_12px] px-[11px] py-[9px] font-sans text-[12px]/[18px] ${
                        message.status === 'failed'
                          ? 'bg-[#fff2f0] text-[#a53e35]'
                          : own
                            ? 'rounded-[12px_3px_12px_12px] bg-orbit pr-[31px] text-white shadow-[0_2px_5px_rgba(86,67,180,.17)]'
                            : 'bg-[#f4f2f6] text-[#47414d]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {own && (
                        <span
                          className={`absolute bottom-2 right-[10px] grid place-items-center ${
                            message.status === 'read' ? 'text-[#9eefd1]' : message.status === 'delivered' ? 'text-[#e8e3ff]' : message.status === 'failed' ? 'text-[#d95d54]' : 'text-[#d7cffb]'
                          }`}
                          title={message.failureReason ?? message.status}
                        >
                          {messageStatus(message.status)}
                        </span>
                      )}
                      {message.status === 'failed' && (
                        <button
                          type="button"
                          className="mt-[5px] border-0 bg-transparent p-0 font-sans text-[10px] font-semibold text-inherit underline"
                          onClick={() => retryMessage(message)}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                    {own && !grouped && <time className="mr-[3px] mt-1 block text-right font-sans text-[8.5px] text-[#b1acb6]">{displayTime(message.createdAt)}</time>}
                  </div>
                </article>
              )
            })}
            {typingUsers.length > 0 && (
              <div className="mt-[15px] flex items-center gap-[7px] font-sans text-[10px] text-[#958f9d]">
                <span className={`${avatarBase} h-[23px] w-[23px] text-[8px] ${avatarColorClass(activeConversation.user.id)}`}>{activeConversation.user.initials}</span>
                <span>
                  <b className="font-semibold text-[#625a6a]">{activeConversation.user.name}</b> is typing{' '}
                  <i className="mx-px inline-block h-[3px] w-[3px] animate-[typing_1.2s_infinite] rounded-full bg-[#968da4]" />
                  <i className="mx-px inline-block h-[3px] w-[3px] animate-[typing_1.2s_infinite] rounded-full bg-[#968da4] [animation-delay:150ms]" />
                  <i className="mx-px inline-block h-[3px] w-[3px] animate-[typing_1.2s_infinite] rounded-full bg-[#968da4] [animation-delay:300ms]" />
                </span>
              </div>
            )}
            <div ref={messageEnd} />
          </div>
        </div>

        <footer className="relative border-t border-[#eeedf1] bg-white px-7 pb-[14px] pt-3 max-[720px]:px-3 max-[720px]:pb-3 max-[720px]:pt-[10px]">
          {error && (
            <div
              role="alert"
              className="absolute bottom-[83px] left-7 z-[5] flex max-w-[calc(100%-56px)] items-center gap-2 rounded-lg border border-[#f2d7ce] bg-[#fffaf8] py-[10px] pl-3 pr-[10px] font-sans text-[10px]/[14px] font-medium text-[#9b483d] shadow-[0_8px_25px_rgba(43,35,55,.12)] max-[720px]:bottom-[78px] max-[720px]:left-3 max-[720px]:max-w-[calc(100%-24px)]"
            >
              <WifiOff size={16} />
              <span className="flex-1">{error}</span>
              <button type="button" className="grid place-items-center border-0 bg-transparent p-[2px] text-[#a76d65]" aria-label="Dismiss" onClick={() => setError(null)}>
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex min-h-[47px] items-end gap-2 rounded-[9px] border border-[#dedbe4] bg-white px-[7px] py-1.5 shadow-[0_1px_2px_rgba(35,28,47,.03)] focus-within:border-[#9b8be4] focus-within:shadow-[0_0_0_3px_rgba(120,99,219,.08)]">
            <button className="grid h-[33px] w-[29px] shrink-0 place-items-center rounded-md border-0 bg-transparent text-[#9f99a6] hover:bg-[#f4f2fb] hover:text-[#6d5cc8]" type="button" aria-label="Attach a file">
              <Paperclip size={20} />
            </button>
            <textarea
              ref={textArea}
              className="max-h-[100px] flex-1 resize-none border-0 bg-transparent py-[7px] font-sans text-[11.5px]/[18px] text-[#494350] outline-none placeholder:text-[#aaa5af]"
              value={draft}
              rows={1}
              maxLength={2000}
              onChange={(event) => { setDraft(event.target.value); notifyTyping(activeConversation.id) }}
              onKeyDown={onComposeKeyDown}
              placeholder={`Message ${activeConversation.user.name}`}
              aria-label={`Message ${activeConversation.user.name}`}
            />
            <button className="grid h-[33px] w-[29px] shrink-0 place-items-center rounded-md border-0 bg-transparent text-[#9f99a6] hover:bg-[#f4f2fb] hover:text-[#6d5cc8]" type="button" aria-label="Add emoji">
              <Smile size={20} />
            </button>
            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border-0 bg-orbit text-white transition-[background,transform] duration-150 hover:not-disabled:-translate-y-px hover:not-disabled:bg-[#6651c6] disabled:cursor-not-allowed disabled:bg-[#f0eef2] disabled:text-[#b6b0bc]"
              type="button"
              disabled={!draft.trim()}
              aria-label="Send message"
              onClick={submitMessage}
            >
              <SendHorizontal size={19} />
            </button>
          </div>
          <div className="flex justify-between pt-[7px] font-sans text-[8.5px] text-[#aaa5ae]">
            <span className="max-[720px]:hidden">
              <kbd className="font-mono">Enter</kbd> to send <span className="mx-[3px]">·</span> <kbd className="font-mono">Shift + Enter</kbd> for new line
            </span>
            <span>{draft.length}/2000</span>
          </div>
        </footer>
      </section>

      <aside className="min-h-svh border-l border-[#e9e8ed] bg-[#fcfcfd] px-5 max-[1060px]:hidden">
        <div className="flex h-[72px] items-center justify-between border-b border-[#ecebf0] font-sans text-[11px] font-semibold text-[#615a68]">
          <span>Conversation details</span>
          <button type="button" className="grid place-items-center rounded-[7px] border-0 bg-transparent p-[6px] text-[#817b8c] transition-colors hover:bg-[#f0eef5] hover:text-[#453d54]" aria-label="Close details">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center border-b border-[#ecebf0] py-[25px]">
          <div className={`${avatarBase} h-[54px] w-[54px] text-[13px] ${avatarColorClass(activeConversation.user.id)}`}>
            {activeConversation.user.initials}
            <i className={presenceDot(activeConversation.user.presence, 'panel')} />
          </div>
          <h2 className="mb-0.5 mt-[11px] font-sans text-[14px]/[18px] font-bold tracking-[-0.35px] text-[#39333f]">{activeConversation.user.name}</h2>
          <p className="font-sans text-[10px]/[15px] text-[#97919d]">{presenceLabel(activeConversation)}</p>
          <div className="mt-[17px] flex w-full gap-[5px]">
            <button type="button" className="flex flex-1 flex-col items-center gap-1 rounded-md border-0 bg-transparent py-1.5 font-sans text-[8.5px] font-medium text-[#827b89] hover:bg-[#f0eef8] hover:text-[#6651c6]">
              <Bell size={16} />Mute
            </button>
            <button type="button" className="flex flex-1 flex-col items-center gap-1 rounded-md border-0 bg-transparent py-1.5 font-sans text-[8.5px] font-medium text-[#827b89] hover:bg-[#f0eef8] hover:text-[#6651c6]">
              <Search size={16} />Search
            </button>
            <button type="button" className="flex flex-1 flex-col items-center gap-1 rounded-md border-0 bg-transparent py-1.5 font-sans text-[8.5px] font-medium text-[#827b89] hover:bg-[#f0eef8] hover:text-[#6651c6]">
              <Archive size={16} />Archive
            </button>
          </div>
        </div>
        <div className="border-b border-[#ecebf0] py-[18px]">
          <div className="flex items-center justify-between font-sans text-[10px] font-semibold text-[#5b5461]">
            <span>Message activity</span>
            <ChevronDown size={16} />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5 rounded-md bg-[#f5f4f7] p-[11px] font-sans text-[9px] text-[#96909c]">
            <span className="font-sans text-[16px] font-bold text-[#5d4eb4]">{messages.length}</span>
            messages in this conversation
          </div>
        </div>
        <div className="relative border-b border-[#ecebf0] py-[18px]">
          <div className="flex items-center justify-between font-sans text-[10px] font-semibold text-[#5b5461]">
            <span>Chat history</span>
          </div>
          <p className="my-[13px] mt-2 font-sans text-[9.5px]/[14px] text-[#97919d]">Download a portable copy of this conversation, including message status metadata.</p>
          <div className="relative">
            <button
              type="button"
              className="flex w-full items-center gap-[7px] rounded-md border border-[#dedbe5] bg-white px-[10px] py-[9px] font-sans text-[10px] font-semibold text-[#61596a] hover:border-[#b9afe2] hover:bg-[#fdfcff]"
              onClick={() => setExportOpen((open) => !open)}
            >
              <Download size={16} />Export history<ChevronDown size={15} className="ml-auto" />
            </button>
            {exportOpen && (
              <div className="absolute inset-x-0 z-[4] mt-[5px] flex flex-col gap-0.5 rounded-lg border border-[#e4e1e9] bg-white p-1 shadow-[0_10px_25px_rgba(43,35,55,.12)]">
                <button
                  type="button"
                  className="flex items-center gap-[9px] rounded-[5px] border-0 bg-transparent p-2 text-left text-[#746b7c] hover:bg-[#f3f1f8] hover:text-[#5d4eb4]"
                  onClick={() => { exportMessages(activeConversation, messages, 'json'); setExportOpen(false) }}
                >
                  <FileJson size={16} />
                  <span>
                    <span className="block font-sans text-[10px]/[13px] font-semibold">JSON</span>
                    <small className="block font-sans text-[8px]/[11px] text-[#aaa4b0]">Full metadata</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-[9px] rounded-[5px] border-0 bg-transparent p-2 text-left text-[#746b7c] hover:bg-[#f3f1f8] hover:text-[#5d4eb4]"
                  onClick={() => { exportMessages(activeConversation, messages, 'csv'); setExportOpen(false) }}
                >
                  <FileSpreadsheet size={16} />
                  <span>
                    <span className="block font-sans text-[10px]/[13px] font-semibold">CSV</span>
                    <small className="block font-sans text-[8px]/[11px] text-[#aaa4b0]">Spreadsheet ready</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 py-[13px] font-sans text-[8.5px] text-[#a09aa5]">
          <span className={`h-1.5 w-1.5 rounded-full ${connectionDotClass}`} />
          {isDemo ? 'Local preview — no server connected' : connection === 'connected' ? 'Synced in real time' : 'Changes will sync on reconnect'}
        </div>
      </aside>
    </main>
  )
}
