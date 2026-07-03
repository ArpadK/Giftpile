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

    it('should show inline error when confirming without a date', async () => {
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

      // Inline error appears instead of a window.alert
      expect(screen.getByText('Please pick a date')).toBeInTheDocument()
      expect(mockOnClaim).not.toHaveBeenCalled()
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

      // Primary button shows loading text and is disabled
      expect(screen.getByText('Saving…')).toBeDisabled()
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

      const backdrop = screen.getByText("Confirm — I'll give this").closest('.sheet-backdrop')
      fireEvent.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close modal when clicking on sheet', () => {
      render(
        <ClaimModal
          gift={mockGift}
          isEdit={false}
          onClaim={mockOnClaim}
          onUnclaim={mockOnUnclaim}
          onClose={mockOnClose}
        />
      )

      const sheet = document.querySelector('.sheet')
      fireEvent.click(sheet)

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

    it('should call onUnclaim directly when clicking unclaim button (no confirm dialog)', async () => {
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

      // All buttons should be disabled while loading; primary shows "Saving…"
      expect(screen.getByText('Saving…')).toBeDisabled()
      expect(screen.getByText('Cancel')).toBeDisabled()
      expect(screen.getByText("I didn't give this after all")).toBeDisabled()

      await waitFor(() => {
        expect(mockOnUnclaim).toHaveBeenCalled()
      })
    })

    it('should show inline error when updating without a date', async () => {
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

      expect(screen.getByText('Please pick a date')).toBeInTheDocument()
      expect(mockOnClaim).not.toHaveBeenCalled()
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
