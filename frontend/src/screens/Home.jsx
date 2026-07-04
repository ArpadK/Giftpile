import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TopBar } from '../components/TopBar'
import { UserRow } from '../components/UserRow'
import { api } from '../lib/api'
import './Home.css'

export function Home() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [allUsers, setAllUsers] = useState([])
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    Promise.all([
      api.get('/api/users'),
      api.get(`/api/users/${currentUser.id}/gifts/count`),
    ])
      .then(([users, count]) => {
        setAllUsers(users)
        setActiveCount(count.activeCount)
      })
      .catch((err) => console.error('Failed to load home data:', err))
  }, [currentUser.id])

  const familyMembers = allUsers.filter(u => u.id !== currentUser.id)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="home">
      <TopBar title={`Hi, ${currentUser.name}`} showLogout onLogout={handleLogout} />

      <div className="home__content">
        <button className="cta-card" onClick={() => navigate('/list/me')}>
          <div className="cta-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v10H4V12" />
              <path d="M2 7h20v5H2z" />
              <path d="M12 22V7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <div className="cta-card__body">
            <div className="cta-card__title">My gift list</div>
            <div className="cta-card__subtext">{activeCount === 1 ? '1 idea' : `${activeCount} ideas`}</div>
          </div>
          <svg className="cta-card__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
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
                />
              ))}
            </div>
          </>
        )}

        {currentUser.isAdmin && (
          <>
            <h3 className="section-label">Manage</h3>
            <div className="admin-row" onClick={() => navigate('/admin')}>
              <div className="admin-row__badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                </svg>
              </div>
              <div className="user-info">
                <div className="user-name">Admin</div>
                <div className="admin-row__subtitle">Manage family members</div>
              </div>
              <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
