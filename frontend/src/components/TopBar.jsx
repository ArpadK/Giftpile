import React from 'react'
import { useNavigate } from 'react-router-dom'
import './TopBar.css'

export function TopBar({ title, showBack = false, backTo = '/', showLogout = false, onLogout }) {
  const navigate = useNavigate()

  return (
    <div className="topbar">
      {showBack ? (
        <button className="topbar__back" aria-label="Back" onClick={() => navigate(backTo)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : (
        <div style={{ width: 20 }} />
      )}

      {title && <h2 className="topbar__title">{title}</h2>}

      {showLogout ? (
        <button className="topbar__icon" aria-label="Log out" onClick={onLogout}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 17H3V3H7M13 7L18 10L13 13M13 13L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : (
        <div style={{ width: 20 }} />
      )}
    </div>
  )
}
