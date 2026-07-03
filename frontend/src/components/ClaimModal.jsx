import React, { useState, useEffect } from 'react'
import './ClaimModal.css'

/**
 * ClaimModal
 *
 * Bottom-sheet modal for claiming a gift with a date.
 *
 * Modes:
 * - New claim: empty date, only confirm button
 * - Edit claim: pre-filled with existing date, shows un-claim button
 *
 * Props:
 * - gift: the gift object being claimed
 * - isEdit: true if editing an existing claim
 * - existingDate: the existing claim date (if isEdit)
 * - onClaim: callback(giftDate) for confirm/update
 * - onUnclaim: callback() for un-claim (edit mode only)
 * - onClose: callback for cancel/backdrop click
 */
export function ClaimModal({ gift, isEdit, existingDate, onClaim, onUnclaim, onClose }) {
  const [giftDate, setGiftDate] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isEdit && existingDate) {
      setGiftDate(existingDate)
    }
  }, [isEdit, existingDate])

  async function handleConfirm() {
    if (!giftDate) {
      alert('Please select a date')
      return
    }
    setLoading(true)
    try {
      await onClaim(giftDate)
    } finally {
      setLoading(false)
    }
  }

  async function handleUnclaim() {
    if (!window.confirm('Are you sure? This will un-claim the gift.')) {
      return
    }
    setLoading(true)
    try {
      await onUnclaim()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet__header">
          <h2 className="modal-sheet__title">Give '{gift.title}'</h2>
        </div>

        <div className="claim-modal__content">
          <p className="claim-modal__helper">
            Pick the day you plan to give this. It'll stay a secret until the day after.
          </p>

          <div className="claim-modal__date-group">
            <label className="claim-modal__label">Gift date</label>
            <input
              type="date"
              value={giftDate}
              onChange={(e) => setGiftDate(e.target.value)}
              className="claim-modal__date-input"
            />
          </div>

          <div className="claim-modal__actions">
            {isEdit ? (
              <>
                <button
                  type="button"
                  className="claim-modal__btn claim-modal__btn--danger"
                  onClick={handleUnclaim}
                  disabled={loading}
                >
                  I didn't give this after all
                </button>
                <button
                  type="button"
                  className="claim-modal__btn claim-modal__btn--secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="claim-modal__btn claim-modal__btn--primary"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update date'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="claim-modal__btn claim-modal__btn--secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="claim-modal__btn claim-modal__btn--primary"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? 'Confirming...' : "Confirm — I'll give this"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
