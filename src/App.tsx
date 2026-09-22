import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, Bell, BellRing, Check, CheckCheck, ChevronDown, CircleAlert, Download,
  FileJson, FileSpreadsheet, Info, Menu, MoreHorizontal, Paperclip, Search,
  SendHorizontal, Settings2, Smile, WifiOff, X,
} from 'lucide-react'
import { AuthScreen } from './components/AuthScreen'
import { PendingUsers } from './components/PendingUsers'
import { CURRENT_USER_ID } from './data/demoChat'
import { chatSocket } from './lib/socket'
import { useRealtime } from './hooks/useRealtime'
import { useChatStore } from './store/chatStore'
import { useAuthStore } from './store/authStore'
import type { ChatMessage, Conversation, MessageStatus } from './types/chat'
import './App.css'

const displayTime = (value: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const EMPTY_TYPING_USERS: string[] = []

function messageStatus(status: MessageStatus) {
  if (status === 'read') return <CheckCheck size={15} aria-label="Read" />
  if (status === 'delivered') return <CheckCheck size={15} aria-label="Delivered" />
  if (status === 'sent') return <Check size={15} aria-label="Sent" />
  if (status === 'failed') return <CircleAlert size={15} aria-label="Failed to send" />
  return <span className="sending-dot" aria-label="Sending" />
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

function App() {
  const authState = useAuthStore((state) => state.state)
  const authUser = useAuthStore((state) => state.user)
  const authError = useAuthStore((state) => state.error)
  const restoreAuth = useAuthStore((state) => state.restore)
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const logout = useAuthStore((state) => state.logout)
  const loadPendingUsers = useAuthStore((state) => state.pendingUsers)
  const setUserStatus = useAuthStore((state) => state.setUserStatus)
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
  const { sendMessage, retryMessage, notifyTyping, markRead, subscribe } = useRealtime(authState === 'authenticated')
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const messageEnd = useRef<HTMLDivElement>(null)
  const textArea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { void restoreAuth() }, [restoreAuth])

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

  if (authState === 'checking') return <main className="auth-shell"><p className="auth-loading">Checking your session…</p></main>
  if (authState !== 'authenticated') return <AuthScreen error={authError} pendingUser={authState === 'pending' ? authUser : null} onLogin={login} onRegister={register} />

  return (
    <main className="chat-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar--open' : ''}`} aria-label="Conversations">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <span>orbit</span>
          <button className="close-mobile" type="button" aria-label="Close conversations" onClick={() => setMobileMenuOpen(false)}><X size={19} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">AR</div>
          <div><strong>Atlas Research</strong><span>Product workspace</span></div>
          <ChevronDown size={16} />
        </div>

        <div className="sidebar-main">
          <div className="conversation-heading">
            <span>Messages</span>
            <button type="button" className="icon-button icon-button--small" aria-label="Message settings"><Settings2 size={16} /></button>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" aria-label="Search messages" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="conversation-list">
            {filteredConversations.map((conversation) => (
              <button key={conversation.id} type="button" className={`conversation-row ${conversation.id === activeConversation.id ? 'conversation-row--active' : ''}`} onClick={() => changeConversation(conversation.id)}>
                <div className="avatar" style={{ '--avatar': conversation.user.color } as React.CSSProperties}>{conversation.user.initials}<i className={`presence presence--${conversation.user.presence}`} /></div>
                <span className="conversation-copy">
                  <span className="conversation-name">{conversation.user.name}</span>
                  <span className="conversation-preview">{conversation.lastMessagePreview}</span>
                </span>
                <span className="conversation-meta">
                  <span>{conversation.lastMessageAt}</span>
                  {conversation.unreadCount > 0 && <b>{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</b>}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="notification-card" type="button" onClick={() => void enableNotifications()}>
            <span className="notification-icon">{notificationPermission === 'granted' ? <BellRing size={16} /> : <Bell size={16} />}</span>
            <span><strong>{notificationPermission === 'granted' ? 'Notifications on' : 'Stay in the loop'}</strong><small>{notificationPermission === 'granted' ? 'Background alerts enabled' : 'Enable desktop alerts'}</small></span>
          </button>
          <div className="account-row">
            <div className="avatar avatar--me">{authUser?.name.slice(0, 2).toUpperCase()}</div><span><strong>{authUser?.name}</strong><small>{authUser?.email}</small></span><button className="icon-button" type="button" aria-label="Sign out" onClick={() => void logout()}><X size={18} /></button>
          </div>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <button className="menu-button" type="button" aria-label="Open conversations" onClick={() => setMobileMenuOpen(true)}><Menu size={21} /></button>
          <div className="avatar avatar--header" style={{ '--avatar': activeConversation.user.color } as React.CSSProperties}>{activeConversation.user.initials}<i className={`presence presence--${activeConversation.user.presence}`} /></div>
          <div className="chat-title"><h1>{activeConversation.user.name}</h1><span><i className={`header-presence header-presence--${activeConversation.user.presence}`} />{presenceLabel(activeConversation)}</span></div>
          <div className="header-actions">
            <span className={`connection-pill connection-pill--${connection}`} title={isDemo ? 'Set VITE_SOCKET_URL to connect a Socket.IO server' : connectionText}><i />{connectionText}</span>
            <button className="icon-button" type="button" aria-label="Conversation information"><Info size={19} /></button>
            <button className="icon-button" type="button" aria-label="More conversation options"><MoreHorizontal size={20} /></button>
          </div>
        </header>

        <div className="message-area">
          <div className="conversation-notice">
            <span>Today</span>
            <p>Messages are protected with end-to-end delivery tracking.</p>
          </div>
          <div className="message-list" aria-live="polite">
            {messages.map((message, index) => {
              const own = message.senderId === CURRENT_USER_ID
              const prior = messages[index - 1]
              const grouped = prior?.senderId === message.senderId
              return (
                <article key={message.id} className={`message-row ${own ? 'message-row--own' : ''} ${grouped ? 'message-row--grouped' : ''}`}>
                  {!own && !grouped && <div className="avatar message-avatar" style={{ '--avatar': activeConversation.user.color } as React.CSSProperties}>{activeConversation.user.initials}</div>}
                  {!own && grouped && <div className="message-avatar-placeholder" />}
                  <div className="message-stack">
                    {!own && !grouped && <div className="message-sender">{activeConversation.user.name}<time>{displayTime(message.createdAt)}</time></div>}
                    <div className={`message-bubble message-bubble--${message.status}`}>
                      <p>{message.text}</p>
                      {own && <span className={`message-status message-status--${message.status}`} title={message.failureReason ?? message.status}>{messageStatus(message.status)}</span>}
                      {message.status === 'failed' && <button type="button" onClick={() => retryMessage(message)}>Retry</button>}
                    </div>
                    {own && !grouped && <time className="own-time">{displayTime(message.createdAt)}</time>}
                  </div>
                </article>
              )
            })}
            {typingUsers.length > 0 && <div className="typing-indicator"><span className="avatar avatar--typing" style={{ '--avatar': activeConversation.user.color } as React.CSSProperties}>{activeConversation.user.initials}</span><span><b>{activeConversation.user.name}</b> is typing <i /><i /><i /></span></div>}
            <div ref={messageEnd} />
          </div>
        </div>

        <footer className="composer-wrap">
          {error && <div className="error-toast" role="alert"><WifiOff size={16} /><span>{error}</span><button type="button" aria-label="Dismiss" onClick={() => setError(null)}><X size={16} /></button></div>}
          <div className="composer">
            <button className="composer-icon" type="button" aria-label="Attach a file"><Paperclip size={20} /></button>
            <textarea ref={textArea} value={draft} rows={1} maxLength={2000} onChange={(event) => { setDraft(event.target.value); notifyTyping(activeConversation.id) }} onKeyDown={onComposeKeyDown} placeholder={`Message ${activeConversation.user.name}`} aria-label={`Message ${activeConversation.user.name}`} />
            <button className="composer-icon" type="button" aria-label="Add emoji"><Smile size={20} /></button>
            <button className="send-button" type="button" disabled={!draft.trim()} aria-label="Send message" onClick={submitMessage}><SendHorizontal size={19} /></button>
          </div>
          <div className="composer-bottom"><span><kbd>Enter</kbd> to send <span className="dot-separator">·</span> <kbd>Shift + Enter</kbd> for new line</span><span>{draft.length}/2000</span></div>
        </footer>
      </section>

      <aside className="details-panel">
        <div className="details-title"><span>Conversation details</span><button type="button" className="icon-button" aria-label="Close details"><X size={18} /></button></div>
        <div className="person-card">
          <div className="avatar person-avatar" style={{ '--avatar': activeConversation.user.color } as React.CSSProperties}>{activeConversation.user.initials}<i className={`presence presence--${activeConversation.user.presence}`} /></div>
          <h2>{activeConversation.user.name}</h2><p>{presenceLabel(activeConversation)}</p>
          <div className="person-actions"><button type="button"><Bell size={16} />Mute</button><button type="button"><Search size={16} />Search</button><button type="button"><Archive size={16} />Archive</button></div>
        </div>
        <div className="details-section">
          <div className="details-row"><span>Message activity</span><ChevronDown size={16} /></div>
          <div className="activity-card"><span className="activity-number">{messages.length}</span><span>messages in this conversation</span></div>
        </div>
        <div className="details-section export-section">
          <div className="details-row"><span>Chat history</span></div>
          <p>Download a portable copy of this conversation, including message status metadata.</p>
          <div className="export-actions">
            <button type="button" onClick={() => setExportOpen((open) => !open)}><Download size={16} />Export history<ChevronDown size={15} /></button>
            {exportOpen && <div className="export-menu"><button type="button" onClick={() => { exportMessages(activeConversation, messages, 'json'); setExportOpen(false) }}><FileJson size={16} /><span>JSON<small>Full metadata</small></span></button><button type="button" onClick={() => { exportMessages(activeConversation, messages, 'csv'); setExportOpen(false) }}><FileSpreadsheet size={16} /><span>CSV<small>Spreadsheet ready</small></span></button></div>}
          </div>
        </div>
        {authUser?.role === 'admin' && <PendingUsers load={loadPendingUsers} update={setUserStatus} />}
        <div className="details-footer"><span className={`status-dot status-dot--${connection}`} />{isDemo ? 'Local preview — no server connected' : connection === 'connected' ? 'Synced in real time' : 'Changes will sync on reconnect'}</div>
      </aside>
    </main>
  )
}

export default App
