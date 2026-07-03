import React from 'react'
import './UserRow.css'

export function UserRow({ user, onClick, children }) {
  const avatarBg = user.color || 'var(--color-primary)'
  const initials = user.name.charAt(0).toUpperCase()

  return (
    <div className="user-row" onClick={onClick}>
      <div className="avatar" style={{ backgroundColor: avatarBg }}>
        {initials}
      </div>
      <div className="user-info">
        <div className="user-name">{user.name}</div>
        {children && <div className="user-meta">{children}</div>}
      </div>
      <svg className="chevron" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
