import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { ChatPage } from './pages/ChatPage'
import { LoginPage } from './pages/LoginPage'
import { RedirectIfSignedIn, RequireAdmin, RequireApprovedUser } from './routes/guards'
import { useAuthStore } from './store/authStore'

function App() {
  const restoreAuth = useAuthStore((state) => state.restore)

  // Runs once at app start, independent of which route was opened directly
  // (e.g. a bookmark to /admin), so route guards always see a settled state.
  useEffect(() => {
    void restoreAuth()
  }, [restoreAuth])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfSignedIn>
              <LoginPage />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/"
          element={
            <RequireApprovedUser>
              <ChatPage />
            </RequireApprovedUser>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
