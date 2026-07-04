import React from 'react'
import { useNavigate } from 'react-router-dom'
import './TopBar.css'

export function TopBar({ title, subtitle, showBack = false, backTo = '/', showLogout = false, onLogout, actions }) {
  const navigate = useNavigate()

  return (
    <div className="topbar">
      {showBack && (
        <button className="topbar__back" aria-label="Back" onClick={() => navigate(backTo)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="topbar__titles">
        {title && <div className="topbar__title">{title}</div>}
        {subtitle && <div className="topbar__subtitle">{subtitle}</div>}
      </div>

      {showLogout && (
        <button className="topbar__icon" aria-label="Log out" onClick={onLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      )}
      {actions}
    </div>
  )
}
