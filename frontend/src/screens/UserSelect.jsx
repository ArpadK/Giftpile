import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRow } from '../components/UserRow'
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
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const res = await fetch('/api/auth/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectUser(userId) {
    navigate(`/login/${userId}`)
  }

  async function handleCreateFirstAdmin(e) {
    e.preventDefault()
    setSetupError('')
    if (!setupName.trim() || !setupPassword) {
      setSetupError('Please enter a name and password')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: setupName.trim(), password: setupPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to create account')
      }
      const created = await res.json()
      // Sign the new admin straight in.
      await login(created.id, setupPassword)
      navigate('/home')
    } catch (err) {
      setSetupError(err.message || 'Failed to create account')
    } finally {
      setCreating(false)
    }
  }

  const isFirstRun = !loading && users.length === 0

  return (
    <div className="user-select">
      <div className="user-select__container">
        <div className="logo-lockup">
          <svg className="logo-icon" width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="10" fill="var(--color-primary)"/>
            <g transform="translate(7, 7)">
              <path d="M15 7H1C0.4 7 0 7.4 0 8V20C0 20.6 0.4 21 1 21H15C15.6 21 16 20.6 16 20V8C16 7.4 15.6 7 15 7Z" fill="white"/>
              <path d="M8 3V7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11 3V7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="4.5" cy="14.5" r="1.5" fill="#4C5FE8"/>
              <circle cx="11.5" cy="14.5" r="1.5" fill="#4C5FE8"/>
            </g>
          </svg>
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
                  onClick={() => handleSelectUser(user.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
