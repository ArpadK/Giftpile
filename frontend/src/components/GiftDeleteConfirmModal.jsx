import React from 'react'
import './Sheet.css'

/**
 * GiftDeleteConfirmModal — lightweight confirm before removing a gift idea.
 */
export function GiftDeleteConfirmModal({ gift, onConfirm, onCancel }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title sheet__title--tight">Remove this gift idea?</div>
        <div className="sheet__text">
          "{gift.title}" will be removed from the list for good.
        </div>
        <div className="sheet__actions">
          <button className="sheet__btn sheet__btn--danger" onClick={onConfirm}>Remove</button>
          <button className="sheet__btn sheet__btn--cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
