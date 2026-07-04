import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore an existing session on mount; a 401 just means "not signed in".
    api.get('/api/auth/me')
      .then(setCurrentUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function login(userId, password) {
    const user = await api.post('/api/auth/login', { userId, password })
    setCurrentUser(user)
    return user
  }

  async function logout() {
    await api.post('/api/auth/logout')
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
