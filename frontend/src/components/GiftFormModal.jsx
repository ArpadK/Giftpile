import React, { useState, useEffect } from 'react'
import './Sheet.css'

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

/**
 * GiftFormModal — bottom-sheet for adding or editing a gift.
 * Fields: Title (required), Link, Price, Notes, and three checkboxes
 * (exact color, exact product/brand, only give once — default checked).
 */
export function GiftFormModal({ gift, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    price: '',
    description: '',
    exactColor: false,
    exactProduct: false,
    onlyOnce: true,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (gift) {
      setFormData({
        title: gift.title || '',
        link: gift.link || '',
        price: gift.price || '',
        description: gift.description || '',
        exactColor: gift.exactColor || false,
        exactProduct: gift.exactProduct || false,
        onlyOnce: gift.onlyOnce !== false,
      })
    }
  }, [gift])

  function setField(name, value) {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function toggle(name) {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }))
  }

  function handleSubmit() {
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!String(formData.price).trim()) {
      setError('Price is required')
      return
    }
    onSave(formData)
  }

  const checkbox = (name, label, hint) => (
    <div className="sheet__check-row" onClick={() => toggle(name)}>
      <div className={`sheet__check-box${formData[name] ? ' sheet__check-box--checked' : ''}`}>
        {formData[name] && <CheckIcon />}
      </div>
      <div className="sheet__check-label">
        {label}{hint && <span className="sheet__check-hint"> {hint}</span>}
      </div>
    </div>
  )

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">{gift ? 'Edit gift idea' : 'Add a gift idea'}</div>

        <label className="sheet__label">Title *</label>
        <input
          className="sheet__input"
          type="text"
          value={formData.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="e.g. Wool socks"
          autoFocus
        />

        <label className="sheet__label">Link (optional)</label>
        <input
          className="sheet__input"
          type="url"
          value={formData.link}
          onChange={(e) => setField('link', e.target.value)}
          placeholder="https://..."
        />

        <label className="sheet__label">Price (€) *</label>
        <input
          className="sheet__input"
          type="number"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={(e) => setField('price', e.target.value)}
          placeholder="e.g. 25"
        />

        <label className="sheet__label">Notes (optional)</label>
        <textarea
          className="sheet__textarea"
          rows="3"
          value={formData.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Any extra detail..."
        />

        {checkbox('exactColor', 'Must be this exact color')}
        {checkbox('exactProduct', 'Must be this exact product / brand')}
        {checkbox('onlyOnce', 'Only give this once', '(uncheck for things like socks)')}

        {error && <div className="sheet__error">{error}</div>}

        <div className="sheet__actions sheet__actions--spaced">
          <button className="sheet__btn sheet__btn--primary" onClick={handleSubmit}>
            {gift ? 'Save changes' : 'Add gift'}
          </button>
          <button className="sheet__btn sheet__btn--cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
