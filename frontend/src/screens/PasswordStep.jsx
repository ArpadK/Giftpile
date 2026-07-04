import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
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
    api.get('/api/users')
      .then((users) => {
        const selected = users.find(u => u.id === Number(userId))
        if (selected) {
          setUser(selected)
        } else {
          navigate('/', { replace: true })
        }
      })
      .catch((err) => {
        console.error('Failed to fetch user:', err)
        navigate('/', { replace: true })
      })
  }, [currentUser, userId, navigate])

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(Number(userId), password)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="password-step">
      <div className="password-step__container">
        <button className="back-link" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Not {user.name}?
        </button>

        <div className="header">
          <div className="avatar" style={{ backgroundColor: user.color || 'var(--color-primary)' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1>Hi, {user.name}</h1>
        </div>

        <form onSubmit={handleSignIn} className="form">
          <label className="form__label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="input"
            autoFocus
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
