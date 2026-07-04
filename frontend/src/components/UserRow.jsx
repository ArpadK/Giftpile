import React from 'react'
import './UserRow.css'

export function UserRow({ user, onClick, children }) {
  return (
    <div className="user-row" onClick={onClick}>
      <div className="user-row__avatar" style={{ backgroundColor: user.color || 'var(--color-primary)' }}>
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div className="user-row__info">
        <div className="user-row__name">{user.name}</div>
        {children && <div className="user-row__meta">{children}</div>}
      </div>
      <svg className="user-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  )
}
