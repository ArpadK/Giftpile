import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './PasswordStep.css'

export function PasswordStep() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { login, currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentUser) {
      navigate('/home')
      return
    }
    fetchUser()
  }, [currentUser, navigate])

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/users')
      const users = await res.json()
      const u = users.find(x => x.id === parseInt(userId))
      setUser(u)
    } catch (err) {
      console.error('Failed to fetch user:', err)
    }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(parseInt(userId), password)
      navigate('/home')
    } catch (err) {
      setError('Invalid password')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div>Loading...</div>

  const avatarBg = user.color || 'var(--color-primary)'

  return (
    <div className="password-step">
      <div className="password-step__container">
        <button className="back-link" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Not {user.name}?
        </button>

        <div className="header">
          <div className="avatar" style={{ backgroundColor: avatarBg }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1>Hi, {user.name}</h1>
        </div>

        <form onSubmit={handleSignIn} className="form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={loading}
            className="input"
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading} className="button-primary">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
