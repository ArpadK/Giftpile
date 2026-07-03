import React, { useState, useEffect } from 'react'
import './UserFormModal.css'

/**
 * UserFormModal
 *
 * Bottom-sheet modal for adding or editing a user.
 *
 * Fields:
 * - Name (required)
 * - Password (required for new, optional for edit — leave blank to keep current)
 * - Is Admin (checkbox)
 *
 * Props:
 * - user: optional existing user for edit mode
 * - onSave: callback(formData)
 * - onClose: callback for cancel/backdrop click
 */
export function UserFormModal({ user, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    isAdmin: false,
  })
  const [errors, setErrors] = useState({})

  // Pre-fill form if editing an existing user
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        password: '',
        isAdmin: user.isAdmin || false,
      })
    }
  }, [user])

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
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Name is required'
    }
    if (!user && (!formData.password || formData.password.trim() === '')) {
      newErrors.password = 'Password is required for new users'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      return
    }

    // Only include password if provided
    const payload = {
      name: formData.name,
      isAdmin: formData.isAdmin,
    }
    if (formData.password) {
      payload.password = formData.password
    }

    onSave(payload)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet__header">
          <h2 className="modal-sheet__title">
            {user ? 'Edit family member' : 'Add family member'}
          </h2>
        </div>

        <form className="modal-sheet__form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-field__label" htmlFor="name">
              Name *
            </label>
            <input
              id="name"
              type="text"
              name="name"
              className="form-field__input"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
            />
            {errors.name && (
              <div className="form-field__error">{errors.name}</div>
            )}
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="password">
              Password {!user && '*'}
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              className="form-field__input"
              value={formData.password}
              onChange={handleChange}
              placeholder={user ? 'Leave blank to keep current' : 'Enter password'}
            />
            {errors.password && (
              <div className="form-field__error">{errors.password}</div>
            )}
          </div>

          <div className="checkbox-group">
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="isAdmin"
                className="checkbox-field__input"
                checked={formData.isAdmin}
                onChange={handleChange}
              />
              <span className="checkbox-field__label">
                Is admin
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
              {user ? 'Save changes' : 'Add member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
