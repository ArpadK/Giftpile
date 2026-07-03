import React, { useState } from 'react'
import './Sheet.css'

/**
 * DeleteUserConfirmModal — high-friction confirm: the admin must type the user's exact name
 * before "Permanently delete" enables. Shows inline guardrail errors (self-delete, last admin).
 */
export function DeleteUserConfirmModal({ user, error, onConfirm, onCancel }) {
  const [confirmName, setConfirmName] = useState('')

  const isNameMatched = confirmName === user.name
  const isDisabled = !isNameMatched || !!error

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__icon-badge sheet__icon-badge--danger">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </div>
        <div className="sheet__title sheet__title--tight">Remove {user.name}?</div>
        <div className="sheet__text sheet__text--tight">
          This permanently deletes <strong>{user.name}</strong>'s account and their entire gift
          list. This can't be undone.
        </div>

        {error ? (
          <div className="sheet__error">{error}</div>
        ) : (
          <>
            <label className="sheet__label">Type "{user.name}" to confirm</label>
            <input
              className="sheet__input"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={user.name}
            />
          </>
        )}

        <div className="sheet__actions">
          <button
            className="sheet__btn sheet__btn--danger"
            disabled={isDisabled}
            onClick={() => !isDisabled && onConfirm(confirmName)}
          >
            Permanently delete
          </button>
          <button className="sheet__btn sheet__btn--cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
