import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AnimatedScreen } from './components/AnimatedScreen'
import { UserSelect } from './screens/UserSelect'
import { PasswordStep } from './screens/PasswordStep'
import { Home } from './screens/Home'
import { GiftList } from './screens/GiftList'
import { AdminPanel } from './screens/AdminPanel'
import './App.css'

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!currentUser) return <Navigate to="/" replace />

  return children
}

function AdminRoute({ children }) {
  const { currentUser, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!currentUser) return <Navigate to="/" replace />
  if (!currentUser.isAdmin) return <Navigate to="/home" replace />

  return children
}

function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (currentUser) return <Navigate to="/home" replace />

  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <AnimatedScreen>
            <PublicRoute>
              <UserSelect />
            </PublicRoute>
          </AnimatedScreen>
        } />
        <Route path="/login/:userId" element={
          <AnimatedScreen>
            <PublicRoute>
              <PasswordStep />
            </PublicRoute>
          </AnimatedScreen>
        } />
        <Route path="/home" element={
          <AnimatedScreen>
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          </AnimatedScreen>
        } />
        <Route path="/list/me" element={
          <AnimatedScreen>
            <ProtectedRoute>
              <GiftList />
            </ProtectedRoute>
          </AnimatedScreen>
        } />
        <Route path="/list/:userId" element={
          <AnimatedScreen>
            <ProtectedRoute>
              <GiftList />
            </ProtectedRoute>
          </AnimatedScreen>
        } />
        <Route path="/admin" element={
          <AnimatedScreen>
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          </AnimatedScreen>
        } />
        <Route path="/admin/list/:userId" element={
          <AnimatedScreen>
            <AdminRoute>
              <GiftList />
            </AdminRoute>
          </AnimatedScreen>
        } />
      </Routes>
    </Router>
  )
}

export default App
