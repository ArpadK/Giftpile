import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteUserConfirmModal } from '../../components/DeleteUserConfirmModal'

describe('DeleteUserConfirmModal', () => {
  const mockUser = { id: 1, name: 'Alice' }

  const renderModal = (props = {}) => {
    const mockOnConfirm = vi.fn()
    const mockOnCancel = vi.fn()
    const defaultProps = {
      user: mockUser,
      error: null,
      onConfirm: mockOnConfirm,
      onCancel: mockOnCancel,
      ...props,
    }
    return { ...render(<DeleteUserConfirmModal {...defaultProps} />), mockOnConfirm, mockOnCancel }
  }

  describe('delete button state', () => {
    it('should disable delete button initially when input is empty', () => {
      renderModal()
      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).toBeDisabled()
    })

    it('should enable delete button when input matches user name exactly', async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByPlaceholderText('Alice')
      await user.type(input, 'Alice')

      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).not.toBeDisabled()
    })

    it('should disable delete button when input does not match user name exactly', async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByPlaceholderText('Alice')
      await user.type(input, 'Alic')

      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).toBeDisabled()
    })

    it('should disable delete button when input is case-sensitive mismatch', async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByPlaceholderText('Alice')
      await user.type(input, 'alice')

      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).toBeDisabled()
    })

    it('should disable delete button when input has extra spaces', async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByPlaceholderText('Alice')
      await user.type(input, 'Alice ')

      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('error state', () => {
    it('should disable delete button when error is present', () => {
      renderModal({ error: 'You cannot delete your own account' })
      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).toBeDisabled()
    })

    it('should show error message when error prop is provided', () => {
      const errorMsg = 'You cannot delete your own account'
      renderModal({ error: errorMsg })
      expect(screen.getByText(errorMsg)).toBeInTheDocument()
    })

    it('should not show input when error is present', () => {
      renderModal({ error: 'You cannot delete your own account' })
      expect(screen.queryByPlaceholderText('Alice')).not.toBeInTheDocument()
    })

    it('should not show confirmation label when error is present', () => {
      renderModal({ error: 'You cannot delete your own account' })
      expect(screen.queryByText(/type "Alice" to confirm/i)).not.toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('should call onConfirm with user name when delete button is clicked', async () => {
      const user = userEvent.setup()
      const { mockOnConfirm } = renderModal()

      const input = screen.getByPlaceholderText('Alice')
      await user.type(input, 'Alice')

      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      await user.click(deleteButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('Alice')
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it('should not call onConfirm when delete button is disabled', async () => {
      const user = userEvent.setup()
      const { mockOnConfirm } = renderModal()

      const input = screen.getByPlaceholderText('Alice')
      await user.type(input, 'Alic')

      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).toBeDisabled()
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should not call onConfirm when error is present', async () => {
      const { mockOnConfirm } = renderModal({ error: 'You cannot delete your own account' })

      const deleteButton = screen.getByRole('button', { name: /permanently delete/i })
      expect(deleteButton).toBeDisabled()
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe('cancellation', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const { mockOnCancel } = renderModal()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onCancel when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const { container, mockOnCancel } = renderModal()

      const backdrop = container.querySelector('.sheet-backdrop')
      await user.click(backdrop)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('rendering', () => {
    it('should display user name in the message', () => {
      renderModal()
      // Name appears inside a <strong> in the body copy
      expect(screen.getByText('Alice', { selector: 'strong' })).toBeInTheDocument()
    })

    it('should display user name in the confirmation label', () => {
      renderModal()
      expect(screen.getByText(/type "Alice" to confirm/i)).toBeInTheDocument()
    })

    it('should show confirmation input placeholder with user name', () => {
      renderModal()
      expect(screen.getByPlaceholderText('Alice')).toBeInTheDocument()
    })

    it('should display title "Remove Alice?"', () => {
      renderModal()
      expect(screen.getByText('Remove Alice?')).toBeInTheDocument()
    })

    it('should display warning message about permanent deletion', () => {
      renderModal()
      expect(screen.getByText(/This can't be undone/i)).toBeInTheDocument()
    })

    it('should display warning about the gift list removal', () => {
      renderModal()
      expect(screen.getByText(/entire gift\s+list/i)).toBeInTheDocument()
    })
  })
})
