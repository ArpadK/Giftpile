import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRow } from '../components/UserRow'
import { api } from '../lib/api'
import './UserSelect.css'

export function UserSelect() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { login } = useAuth()

  // First-run setup form state
  const [setupName, setSetupName] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupError, setSetupError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.get('/api/users')
      .then(setUsers)
      .catch((err) => console.error('Failed to fetch users:', err))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreateFirstAdmin(e) {
    e.preventDefault()
    setSetupError('')
    if (!setupName.trim() || !setupPassword) {
      setSetupError('Please enter a name and password')
      return
    }
    setCreating(true)
    try {
      const created = await api.post('/api/auth/users', {
        name: setupName.trim(),
        password: setupPassword,
      })
      // Sign the new admin straight in.
      await login(created.id, setupPassword)
      navigate('/home')
    } catch (err) {
      setSetupError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const isFirstRun = !loading && users.length === 0

  return (
    <div className="user-select">
      <div className="user-select__container">
        <div className="logo-lockup">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v10H4V12" />
              <path d="M2 7h20v5H2z" />
              <path d="M12 22V7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <h1 className="logo-text">Giftpile</h1>
        </div>

        {isFirstRun ? (
          <>
            <p className="subheading">Welcome! Create your admin account to get started.</p>
            <form className="setup-form" onSubmit={handleCreateFirstAdmin}>
              <input
                type="text"
                className="setup-form__input"
                placeholder="Your name"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                disabled={creating}
                autoFocus
              />
              <input
                type="password"
                className="setup-form__input"
                placeholder="Password"
                autoComplete="new-password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                disabled={creating}
              />
              {setupError && <p className="setup-form__error">{setupError}</p>}
              <button type="submit" className="setup-form__button" disabled={creating}>
                {creating ? 'Creating…' : 'Create admin account'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="subheading">Who's this?</p>
            <div className="user-list">
              {users.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onClick={() => navigate(`/login/${user.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
