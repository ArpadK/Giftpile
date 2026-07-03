import React from 'react'
import './Sheet.css'

/**
 * AdminEditConfirmModal — medium-friction confirm before an admin edits someone else's list.
 */
export function AdminEditConfirmModal({ userName, onConfirm, onCancel }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__icon-badge sheet__icon-badge--amber">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
        <div className="sheet__title sheet__title--tight">Are you sure?</div>
        <div className="sheet__text">
          You're about to view and edit <strong>{userName}</strong>'s list as admin. This could
          spoil a surprise if you're not careful.
        </div>
        <div className="sheet__actions">
          <button className="sheet__btn sheet__btn--primary" onClick={onConfirm}>Yes, continue</button>
          <button className="sheet__btn sheet__btn--cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
