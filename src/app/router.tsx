import { createBrowserRouter } from 'react-router'
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage'
import { InboxPage } from '../features/agents/pages/InboxPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { PendingPage } from '../features/auth/pages/PendingPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { CustomerChatPage } from '../features/chat/pages/CustomerChatPage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'
import { ConversationLinkRedirect, GuestOnly, HomeRedirect, RequireAuth } from './RequireAuth'

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  { path: '/pending', element: <PendingPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <HomeRedirect /> },
      {
        element: <AppShell />,
        children: [
          { element: <RequireAuth roles={['user']} />, children: [{ path: '/chat', element: <CustomerChatPage /> }] },
          {
            element: <RequireAuth roles={['agent', 'admin']} />,
            children: [
              { path: '/inbox', element: <InboxPage /> },
              { path: '/inbox/:conversationId', element: <InboxPage /> },
            ],
          },
          { element: <RequireAuth roles={['admin']} />, children: [{ path: '/admin', element: <AdminDashboardPage /> }] },
        ],
      },
    ],
  },
  // Push notification links use /chat/:conversationId — send each role to the right place.
  { path: '/chat/:conversationId', element: <RequireAuth />, children: [{ index: true, element: <ConversationLinkRedirect /> }] },
  { path: '*', element: <NotFoundPage /> },
])
