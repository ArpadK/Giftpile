import React, { useState, useEffect } from 'react'
import './Sheet.css'

/**
 * ClaimModal — bottom-sheet for claiming a gift on a chosen date.
 * New claim: date + confirm. Edit: pre-filled date, confirm, and an "I didn't give this
 * after all" removal button.
 */
export function ClaimModal({ gift, isEdit, existingDate, onClaim, onUnclaim, onClose }) {
  const [giftDate, setGiftDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit && existingDate) setGiftDate(existingDate)
  }, [isEdit, existingDate])

  async function handleConfirm() {
    if (!giftDate) {
      setError('Please pick a date')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onClaim(giftDate)
    } finally {
      setLoading(false)
    }
  }

  async function handleUnclaim() {
    setLoading(true)
    try {
      await onUnclaim()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title sheet__title--tight">Give '{gift.title}'</div>
        <p className="sheet__text">
          Pick the day you plan to give this. It'll stay a secret until the day after.
        </p>

        <label className="sheet__label">Gift date</label>
        <input
          className="sheet__input"
          type="date"
          value={giftDate}
          onChange={(e) => setGiftDate(e.target.value)}
        />

        {error && <div className="sheet__error">{error}</div>}

        <div className="sheet__actions">
          <button className="sheet__btn sheet__btn--primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Saving…' : (isEdit ? 'Update date' : "Confirm — I'll give this")}
          </button>
          {isEdit && (
            <button className="sheet__btn sheet__btn--danger-soft" onClick={handleUnclaim} disabled={loading}>
              I didn't give this after all
            </button>
          )}
          <button className="sheet__btn sheet__btn--cancel" onClick={onClose} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
