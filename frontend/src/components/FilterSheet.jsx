import React, { useState } from 'react'
import './Sheet.css'

export function FilterSheet({ priceMin, priceMax, onApply, onClose }) {
  const [min, setMin] = useState(priceMin)
  const [max, setMax] = useState(priceMax)

  function handleApply() {
    onApply({ priceMin: min, priceMax: max })
    onClose()
  }

  function handleClear() {
    onApply({ priceMin: '', priceMax: '' })
    onClose()
  }

  const hasValues = min !== '' || max !== ''

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h2 className="sheet__title">Filter</h2>

        <label className="sheet__label">Price range (€)</label>
        <div className="sheet__input-row">
          <input
            className="sheet__input"
            type="number"
            min="0"
            placeholder="Min"
            value={min}
            onChange={e => setMin(e.target.value)}
          />
          <input
            className="sheet__input"
            type="number"
            min="0"
            placeholder="Max"
            value={max}
            onChange={e => setMax(e.target.value)}
          />
        </div>

        <div className="sheet__actions sheet__actions--spaced">
          <button className="sheet__btn sheet__btn--primary" onClick={handleApply}>Apply</button>
          {hasValues && (
            <button className="sheet__btn sheet__btn--cancel" onClick={handleClear}>Clear filter</button>
          )}
          <button className="sheet__btn sheet__btn--cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
