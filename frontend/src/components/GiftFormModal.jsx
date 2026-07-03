import React, { useState, useEffect } from 'react'
import './GiftFormModal.css'

/**
 * GiftFormModal
 *
 * Bottom-sheet modal for adding or editing a gift.
 *
 * Fields:
 * - Title (required)
 * - Link (optional)
 * - Price (optional)
 * - Notes / Description (optional)
 * - Checkboxes:
 *   * "Must be this exact color" (exactColor)
 *   * "Must be this exact product / brand" (exactProduct)
 *   * "Only give this once" (onlyOnce, default checked)
 *
 * Validation: title is required.
 *
 * Props:
 * - gift: optional existing gift for edit mode
 * - onSave: callback(formData)
 * - onClose: callback for cancel/backdrop click
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
  const [errors, setErrors] = useState({})

  // Pre-fill form if editing an existing gift
  useEffect(() => {
    if (gift) {
      setFormData({
        title: gift.title || '',
        link: gift.link || '',
        price: gift.price || '',
        description: gift.description || '',
        exactColor: gift.exactColor || false,
        exactProduct: gift.exactProduct || false,
        onlyOnce: gift.onlyOnce !== false, // default true
      })
    }
  }, [gift])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Clear error for this field when user starts editing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function validate() {
    const newErrors = {}
    if (!formData.title || formData.title.trim() === '') {
      newErrors.title = 'Title is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      return
    }
    onSave(formData)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet__header">
          <h2 className="modal-sheet__title">
            {gift ? 'Edit gift idea' : 'Add a gift idea'}
          </h2>
        </div>

        <form className="modal-sheet__form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-field__label" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              type="text"
              name="title"
              className="form-field__input"
              value={formData.title}
              onChange={handleChange}
              placeholder="What do you want?"
            />
            {errors.title && (
              <div className="form-field__error">{errors.title}</div>
            )}
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="link">
              Link
            </label>
            <input
              id="link"
              type="url"
              name="link"
              className="form-field__input"
              value={formData.link}
              onChange={handleChange}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="price">
              Price
            </label>
            <input
              id="price"
              type="text"
              name="price"
              className="form-field__input"
              value={formData.price}
              onChange={handleChange}
              placeholder="$50"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="description">
              Notes
            </label>
            <textarea
              id="description"
              name="description"
              className="form-field__textarea"
              value={formData.description}
              onChange={handleChange}
              placeholder="Any special details?"
            />
          </div>

          <div className="checkbox-group">
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="exactColor"
                className="checkbox-field__input"
                checked={formData.exactColor}
                onChange={handleChange}
              />
              <span className="checkbox-field__label">
                Must be this exact color
              </span>
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                name="exactProduct"
                className="checkbox-field__input"
                checked={formData.exactProduct}
                onChange={handleChange}
              />
              <span className="checkbox-field__label">
                Must be this exact product / brand
              </span>
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                name="onlyOnce"
                className="checkbox-field__input"
                checked={formData.onlyOnce}
                onChange={handleChange}
              />
              <span className="checkbox-field__label">
                Only give this once
              </span>
            </label>
          </div>

          <div className="modal-sheet__actions">
            <button
              type="button"
              className="modal-sheet__btn modal-sheet__btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-sheet__btn modal-sheet__btn--primary"
            >
              {gift ? 'Save changes' : 'Add gift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
