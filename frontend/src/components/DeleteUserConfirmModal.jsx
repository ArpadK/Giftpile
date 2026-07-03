import React, { useState } from 'react'
import './DeleteUserConfirmModal.css'

/**
 * DeleteUserConfirmModal
 *
 * Confirmation dialog for deleting a user.
 * Requires exact name match before "Permanently delete" button is enabled.
 * Shows inline error text for guardrail violations (self-delete, last admin).
 *
 * Props:
 * - user: the user object to delete
 * - error: optional error message (e.g., "You cannot delete your own account")
 * - onConfirm: callback(userName) when user confirms deletion
 * - onCancel: callback when user cancels or clicks backdrop
 */
export function DeleteUserConfirmModal({ user, error, onConfirm, onCancel }) {
  const [confirmName, setConfirmName] = useState('')

  const isNameMatched = confirmName === user.name
  const isDisabled = !isNameMatched || !!error

  function handleSubmit(e) {
    e.preventDefault()
    if (!isDisabled) {
      onConfirm(confirmName)
    }
  }

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__content">
          <h3 className="confirm-dialog__title">Delete user?</h3>
          <p className="confirm-dialog__message">
            Are you sure you want to permanently delete
            <span className="confirm-dialog__user-name">"{user.name}"</span>
            This action cannot be undone. All their gifts and claims will be removed.
          </p>

          {error && (
            <div className="confirm-dialog__error">
              {error}
            </div>
          )}

          {!error && (
            <div className="confirm-dialog__form-group">
              <label className="confirm-dialog__label">
                Type "{user.name}" to confirm
              </label>
              <input
                type="text"
                className="confirm-dialog__input"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={user.name}
                disabled={!!error}
              />
            </div>
          )}
        </div>

        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="confirm-dialog__btn confirm-dialog__btn--delete"
            disabled={isDisabled}
            onClick={handleSubmit}
          >
            Permanently delete
          </button>
        </div>
      </div>
    </div>
  )
}
