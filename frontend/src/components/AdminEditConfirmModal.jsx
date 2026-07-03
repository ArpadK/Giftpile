import React from 'react'
import './AdminEditConfirmModal.css'

/**
 * AdminEditConfirmModal
 *
 * Medium-friction confirmation dialog for admin editing another user's list.
 * Warns that the admin is about to view and edit someone else's list and that it could spoil a surprise.
 *
 * Props:
 * - userName: name of the user whose list will be edited
 * - onConfirm: callback when user confirms
 * - onCancel: callback when user cancels or clicks backdrop
 */
export function AdminEditConfirmModal({ userName, onConfirm, onCancel }) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__content">
          <h3 className="confirm-dialog__title">Are you sure?</h3>
          <p className="confirm-dialog__message">
            You're about to view and edit <strong>{userName}</strong>'s list as admin.
            <br />
            <br />
            This could spoil a surprise!
          </p>
        </div>

        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="confirm-dialog__btn confirm-dialog__btn--primary"
            onClick={onConfirm}
          >
            Yes, continue
          </button>
        </div>
      </div>
    </div>
  )
}
