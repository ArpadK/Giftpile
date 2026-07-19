import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
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
        <Route path="/" element={<PublicRoute><UserSelect /></PublicRoute>} />
        <Route path="/login/:userId" element={<PublicRoute><PasswordStep /></PublicRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/list/me" element={<ProtectedRoute><GiftList /></ProtectedRoute>} />
        <Route path="/list/:userId" element={<ProtectedRoute><GiftList /></ProtectedRoute>} />
        <Route path="/manage/list/:userId" element={<ProtectedRoute><GiftList /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/admin/list/:userId" element={<AdminRoute><GiftList /></AdminRoute>} />
      </Routes>
    </Router>
  )
}

export default App
