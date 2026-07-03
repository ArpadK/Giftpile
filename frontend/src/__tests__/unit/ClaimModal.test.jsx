import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClaimModal } from '../../components/ClaimModal'

describe('ClaimModal', () => {
  const mockGift = {
    id: '1',
    title: 'Test Gift',
    url: 'https://example.com',
    imageUrl: 'https://example.com/image.jpg',
  }

  let mockOnClaim, mockOnUnclaim, mockOnClose

  beforeEach(() => {
    mockOnClaim = vi.fn()
    mockOnUnclaim = vi.fn()
    mockOnClose = vi.fn()
  })

  describe('new claim mode (isEdit=false)', () => {
    it('should render without unclaim button in new claim mode', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      // Should NOT have the unclaim button
      expect(screen.queryByText("I didn't give this after all")).not.toBeInTheDocument()

      // Should have the confirm button text
      expect(screen.getByText("Confirm — I'll give this")).toBeInTheDocument()

      // Should have cancel button
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should render empty date input in new claim mode', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const dateInput = screen.getByDisplayValue('')
      expect(dateInput).toHaveAttribute('type', 'date')
    })

    it('should render gift title in modal header', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText("Give 'Test Gift'")).toBeInTheDocument()
    })

    it('should render helper text', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      expect(
        screen.getByText("Pick the day you plan to give this. It'll stay a secret until the day after.")
      ).toBeInTheDocument()
    })

    it('should alert when confirming without a date', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const confirmButton = screen.getByText("Confirm — I'll give this")
      fireEvent.click(confirmButton)

      expect(alertSpy).toHaveBeenCalledWith('Please select a date')
      expect(mockOnClaim).not.toHaveBeenCalled()

      alertSpy.mockRestore()
    })

    it('should call onClaim with date when confirming with a date', async () => {
      mockOnClaim.mockResolvedValue(undefined)

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const dateInput = screen.getByDisplayValue('')
      await userEvent.type(dateInput, '2025-12-25')

      const confirmButton = screen.getByText("Confirm — I'll give this")
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockOnClaim).toHaveBeenCalledWith('2025-12-25')
      })
    })

    it('should disable buttons while loading', async () => {
      mockOnClaim.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const dateInput = screen.getByDisplayValue('')
      await userEvent.type(dateInput, '2025-12-25')

      const confirmButton = screen.getByText("Confirm — I'll give this")
      fireEvent.click(confirmButton)

      // Button should show loading text and be disabled
      expect(screen.getByText('Confirming...')).toBeDisabled()
      expect(screen.getByText('Cancel')).toBeDisabled()

      await waitFor(() => {
        expect(mockOnClaim).toHaveBeenCalled()
      })
    })

    it('should call onClose when cancel button clicked', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop clicked', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const backdrop = screen.getByText("Confirm — I'll give this").closest('.modal-backdrop')
      fireEvent.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close modal when clicking on modal sheet', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const modalSheet = document.querySelector('.modal-sheet')
      fireEvent.click(modalSheet)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('edit claim mode (isEdit=true)', () => {
    it('should show unclaim button in edit mode', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      // Should have the unclaim button
      expect(screen.getByText("I didn't give this after all")).toBeInTheDocument()

      // Should have update button instead of confirm
      expect(screen.getByText('Update date')).toBeInTheDocument()
      expect(screen.queryByText("Confirm — I'll give this")).not.toBeInTheDocument()
    })

    it('should pre-fill date input with existing date in edit mode', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByDisplayValue('2025-12-25')).toBeInTheDocument()
    })

    it('should call onClaim with new date when updating date', async () => {
      mockOnClaim.mockResolvedValue(undefined)

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const dateInput = screen.getByDisplayValue('2025-12-25')
      await userEvent.clear(dateInput)
      await userEvent.type(dateInput, '2026-01-15')

      const updateButton = screen.getByText('Update date')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(mockOnClaim).toHaveBeenCalledWith('2026-01-15')
      })
    })

    it('should show confirmation dialog when clicking unclaim button', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const unclaimButton = screen.getByText("I didn't give this after all")
      fireEvent.click(unclaimButton)

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure? This will un-claim the gift.')
      expect(mockOnUnclaim).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('should call onUnclaim when confirming unclaim', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockOnUnclaim.mockResolvedValue(undefined)

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const unclaimButton = screen.getByText("I didn't give this after all")
      fireEvent.click(unclaimButton)

      await waitFor(() => {
        expect(mockOnUnclaim).toHaveBeenCalled()
      })
    })

    it('should disable all buttons while unclaiming', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockOnUnclaim.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const unclaimButton = screen.getByText("I didn't give this after all")
      fireEvent.click(unclaimButton)

      // All buttons should be disabled while loading
      expect(screen.getByText('Updating...')).toBeDisabled()
      expect(screen.getByText('Cancel')).toBeDisabled()
      expect(screen.getByText("I didn't give this after all")).toBeDisabled()

      await waitFor(() => {
        expect(mockOnUnclaim).toHaveBeenCalled()
      })
    })

    it('should alert when updating without a date', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const dateInput = screen.getByDisplayValue('2025-12-25')
      await userEvent.clear(dateInput)

      const updateButton = screen.getByText('Update date')
      fireEvent.click(updateButton)

      expect(alertSpy).toHaveBeenCalledWith('Please select a date')
      expect(mockOnClaim).not.toHaveBeenCalled()

      alertSpy.mockRestore()
    })

    it('should render all three buttons in edit mode', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText("I didn't give this after all")).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Update date')).toBeInTheDocument()
    })

    it('should call onClose when cancel button clicked in edit mode', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate="2025-12-25"
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty existingDate gracefully', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate=""
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })

    it('should handle undefined existingDate gracefully', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={true}
          existingDate={undefined}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })
  })
})
