import React, { useState, useEffect } from 'react'
import './Sheet.css'

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

/**
 * UserFormModal — bottom-sheet for adding or editing a family member.
 *
 * A member can be a normal user, an admin, or a kid. Kids are curated by assigned parents and may
 * optionally be allowed to log in. Kid and Admin are mutually exclusive. When a kid can log in a
 * password is required (as for any normal user); a no-login kid needs none.
 */
export function UserFormModal({ user, allUsers = [], onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '', password: '', isAdmin: false, isKid: false, canLogin: false, parentIds: [],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        password: '',
        isAdmin: user.isAdmin || false,
        isKid: user.isKid || false,
        canLogin: user.isKid ? (user.canLogin || false) : false,
        parentIds: user.parentIds || [],
      })
    }
  }, [user])

  // Only non-kid users (and never the kid being edited) may be parents.
  const parentCandidates = allUsers.filter(u => !u.isKid && (!user || u.id !== user.id))

  const passwordRequired = !user && (!formData.isKid || formData.canLogin)

  function toggleKid() {
    setFormData(p => ({ ...p, isKid: !p.isKid, isAdmin: p.isKid ? p.isAdmin : false }))
  }

  function toggleAdmin() {
    setFormData(p => ({ ...p, isAdmin: !p.isAdmin, isKid: p.isAdmin ? p.isKid : false }))
  }

  function toggleParent(id) {
    setFormData(p => ({
      ...p,
      parentIds: p.parentIds.includes(id)
        ? p.parentIds.filter(x => x !== id)
        : [...p.parentIds, id],
    }))
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    if (passwordRequired && !formData.password) {
      setError('Password is required')
      return
    }
    const payload = {
      name: formData.name.trim(),
      isAdmin: formData.isAdmin,
      isKid: formData.isKid,
      canLogin: formData.isKid ? formData.canLogin : true,
      parentIds: formData.isKid ? formData.parentIds : [],
    }
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

        <div className="sheet__check-row" onClick={toggleKid}>
          <div className={`sheet__check-box${formData.isKid ? ' sheet__check-box--checked' : ''}`}>
            {formData.isKid && <CheckIcon />}
          </div>
          <div className="sheet__check-label">Kid account (managed by parents)</div>
        </div>

        {formData.isKid && (
          <div className="sheet__check-row" onClick={() => setFormData(p => ({ ...p, canLogin: !p.canLogin }))}>
            <div className={`sheet__check-box${formData.canLogin ? ' sheet__check-box--checked' : ''}`}>
              {formData.canLogin && <CheckIcon />}
            </div>
            <div className="sheet__check-label">Can log in</div>
          </div>
        )}

        {(!formData.isKid || formData.canLogin) && (
          <>
            <label className="sheet__label">
              Password{user ? ' (leave blank to keep current)' : passwordRequired ? '' : ' (optional)'}
            </label>
            <input
              className="sheet__input"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
              placeholder={user ? 'Leave blank to keep current' : 'Enter password'}
            />
          </>
        )}

        {!formData.isKid && (
          <div className="sheet__check-row" onClick={toggleAdmin}>
            <div className={`sheet__check-box${formData.isAdmin ? ' sheet__check-box--checked' : ''}`}>
              {formData.isAdmin && <CheckIcon />}
            </div>
            <div className="sheet__check-label">Admin access</div>
          </div>
        )}

        {formData.isKid && (
          <>
            <label className="sheet__label">Parents</label>
            {parentCandidates.length === 0 ? (
              <p className="sheet__hint">No eligible users to assign as parents yet.</p>
            ) : (
              <div className="sheet__parent-list">
                {parentCandidates.map(u => (
                  <div key={u.id} className="sheet__check-row" onClick={() => toggleParent(u.id)}>
                    <div className={`sheet__check-box${formData.parentIds.includes(u.id) ? ' sheet__check-box--checked' : ''}`}>
                      {formData.parentIds.includes(u.id) && <CheckIcon />}
                    </div>
                    <div className="sheet__check-label">{u.name}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && <div className="sheet__error">{error}</div>}

        <div className="sheet__actions sheet__actions--spaced">
          <button className="sheet__btn sheet__btn--primary" onClick={handleSubmit}>Save</button>
          <button className="sheet__btn sheet__btn--cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
