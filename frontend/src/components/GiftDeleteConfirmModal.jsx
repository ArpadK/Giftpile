import React from 'react'
import './GiftDeleteConfirmModal.css'

/**
 * GiftDeleteConfirmModal
 *
 * Lightweight confirmation dialog for deleting a gift.
 * Shows the gift title and requires a single tap on "Remove" to confirm.
 *
 * Props:
 * - gift: the gift object to delete (used for display)
 * - onConfirm: callback when user confirms deletion
 * - onCancel: callback when user cancels or clicks backdrop
 */
export function GiftDeleteConfirmModal({ gift, onConfirm, onCancel }) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__content">
          <h3 className="confirm-dialog__title">Remove gift?</h3>
          <p className="confirm-dialog__message">
            Are you sure you want to remove
            <span className="confirm-dialog__gift-title">"{gift.title}"</span>
            This action cannot be undone.
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
            className="confirm-dialog__btn confirm-dialog__btn--delete"
            onClick={onConfirm}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
