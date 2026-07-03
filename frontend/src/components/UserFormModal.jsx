import React, { useState, useEffect } from 'react'
import './Sheet.css'

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

/**
 * UserFormModal — bottom-sheet for adding or editing a family member.
 * Name, Password (required for new; blank keeps current when editing), and Admin access.
 */
export function UserFormModal({ user, onSave, onClose }) {
  const [formData, setFormData] = useState({ name: '', password: '', isAdmin: false })
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', password: '', isAdmin: user.isAdmin || false })
    }
  }, [user])

  function handleSubmit() {
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    if (!user && !formData.password) {
      setError('Password is required for new users')
      return
    }
    const payload = { name: formData.name.trim(), isAdmin: formData.isAdmin }
    if (formData.password) payload.password = formData.password
    onSave(payload)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">{user ? 'Edit family member' : 'Add family member'}</div>

        <label className="sheet__label">Name</label>
        <input
          className="sheet__input"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
          placeholder="Enter name"
          autoFocus
        />

        <label className="sheet__label">Password{user && ' (leave blank to keep current)'}</label>
        <input
          className="sheet__input"
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
          placeholder={user ? 'Leave blank to keep current' : 'Enter password'}
        />

        <div className="sheet__check-row" onClick={() => setFormData(p => ({ ...p, isAdmin: !p.isAdmin }))}>
          <div className={`sheet__check-box${formData.isAdmin ? ' sheet__check-box--checked' : ''}`}>
            {formData.isAdmin && <CheckIcon />}
          </div>
          <div className="sheet__check-label">Admin access</div>
        </div>

        {error && <div className="sheet__error">{error}</div>}

        <div className="sheet__actions sheet__actions--spaced">
          <button className="sheet__btn sheet__btn--primary" onClick={handleSubmit}>Save</button>
          <button className="sheet__btn sheet__btn--cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
