import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TopBar } from '../components/TopBar'
import { UserRow } from '../components/UserRow'
import './Home.css'

export function Home() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [allUsers, setAllUsers] = useState([])
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }
    fetchData()
  }, [currentUser, navigate])

  async function fetchData() {
    try {
      const [usersRes, countRes] = await Promise.all([
        fetch('/api/auth/users'),
        fetch(`/api/users/${currentUser.id}/gifts/count`, {
          credentials: 'include',
        }),
      ])
      const users = await usersRes.json()
      setAllUsers(users)
      if (countRes.ok) {
        const { activeCount } = await countRes.json()
        setActiveCount(activeCount)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  // The effect above redirects when there is no session; guard the render so we never
  // dereference a null currentUser on the pass before navigation happens.
  if (!currentUser) return null

  const familyMembers = allUsers.filter(u => u.id !== currentUser.id)

  return (
    <div className="home">
      <TopBar title={`Hi, ${currentUser.name}`} showLogout onLogout={async () => {
        await logout()
        navigate('/')
      }} />

      <div className="home__content">
        <button className="cta-card" onClick={() => navigate('/list/me')}>
          <div className="cta-card__icon">🎁</div>
          <div className="cta-card__body">
            <div className="cta-card__title">My gift list</div>
            <div className="cta-card__subtext">{activeCount} active ideas</div>
          </div>
          <svg className="cta-card__chevron" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {familyMembers.length > 0 && (
          <>
            <h3 className="section-label">Family</h3>
            <div className="user-list">
              {familyMembers.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onClick={() => navigate(`/list/${user.id}`)}
                >
                  {/* Gift count would go here */}
                </UserRow>
              ))}
            </div>
          </>
        )}

        {currentUser.isAdmin && (
          <>
            <h3 className="section-label">Manage</h3>
            <div className="admin-row" onClick={() => navigate('/admin')}>
              <div className="avatar" style={{ backgroundColor: 'var(--color-amber)' }}>
                ⚙️
              </div>
              <div className="user-info">
                <div className="user-name">Admin</div>
              </div>
              <svg className="chevron" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
