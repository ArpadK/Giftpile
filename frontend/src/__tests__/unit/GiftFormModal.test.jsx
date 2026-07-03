import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GiftFormModal } from '../../components/GiftFormModal'

describe('GiftFormModal', () => {
  it('should render with empty fields for new gift', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Check that modal is visible with correct title
    expect(screen.getByRole('heading')).toHaveTextContent('Add a gift idea')

    // Check all input fields are empty
    expect(screen.getByPlaceholderText('What do you want?')).toHaveValue('')
    expect(screen.getByPlaceholderText('https://example.com')).toHaveValue('')
    expect(screen.getByPlaceholderText('$50')).toHaveValue('')
    expect(screen.getByPlaceholderText('Any special details?')).toHaveValue('')

    // Check button text
    expect(screen.getByRole('button', { name: /Add gift/ })).toBeInTheDocument()
  })

  it('should have "Only give this once" checked by default', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Find the "Only give this once" checkbox and verify it's checked
    const onlyOnceCheckbox = screen.getByRole('checkbox', {
      name: /Only give this once/,
    })
    expect(onlyOnceCheckbox).toBeChecked()

    // Other checkboxes should not be checked by default
    const exactColorCheckbox = screen.getByRole('checkbox', {
      name: /Must be this exact color/,
    })
    const exactProductCheckbox = screen.getByRole('checkbox', {
      name: /Must be this exact product/,
    })
    expect(exactColorCheckbox).not.toBeChecked()
    expect(exactProductCheckbox).not.toBeChecked()
  })

  it('should show validation error when title is empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Click the submit button without entering a title
    const submitButton = screen.getByRole('button', { name: /Add gift/ })
    await user.click(submitButton)

    // Check that error message appears
    expect(screen.getByText('Title is required')).toBeInTheDocument()

    // onSave should not be called
    expect(onSave).not.toHaveBeenCalled()
  })

  it('should call onSave on valid submit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Fill in the required title field
    const titleInput = screen.getByPlaceholderText('What do you want?')
    await user.type(titleInput, 'PlayStation 5')

    // Fill in some optional fields
    const linkInput = screen.getByPlaceholderText('https://example.com')
    await user.type(linkInput, 'https://amazon.com/ps5')

    const priceInput = screen.getByPlaceholderText('$50')
    await user.type(priceInput, '$499')

    const descriptionInput = screen.getByPlaceholderText('Any special details?')
    await user.type(descriptionInput, 'The newer model')

    // Check one of the optional checkboxes
    const exactProductCheckbox = screen.getByRole('checkbox', {
      name: /Must be this exact product/,
    })
    await user.click(exactProductCheckbox)

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Add gift/ })
    await user.click(submitButton)

    // Verify onSave was called with correct data
    expect(onSave).toHaveBeenCalledWith({
      title: 'PlayStation 5',
      link: 'https://amazon.com/ps5',
      price: '$499',
      description: 'The newer model',
      exactColor: false,
      exactProduct: true,
      onlyOnce: true, // Should still be checked by default
    })
  })

  it('should pre-fill fields in edit mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const existingGift = {
      title: 'iPhone 15',
      link: 'https://apple.com/iphone',
      price: '$999',
      description: 'Pro Max variant',
      exactColor: true,
      exactProduct: true,
      onlyOnce: false,
    }

    render(
      <GiftFormModal
        gift={existingGift}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Check that modal title reflects edit mode
    expect(screen.getByRole('heading')).toHaveTextContent('Edit gift idea')

    // Check that all fields are pre-filled
    expect(screen.getByPlaceholderText('What do you want?')).toHaveValue(
      'iPhone 15'
    )
    expect(screen.getByPlaceholderText('https://example.com')).toHaveValue(
      'https://apple.com/iphone'
    )
    expect(screen.getByPlaceholderText('$50')).toHaveValue('$999')
    expect(screen.getByPlaceholderText('Any special details?')).toHaveValue(
      'Pro Max variant'
    )

    // Check that checkboxes are in correct state
    expect(
      screen.getByRole('checkbox', { name: /Must be this exact color/ })
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /Must be this exact product/ })
    ).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Only give this once/ })).not.toBeChecked()

    // Check button text
    expect(
      screen.getByRole('button', { name: /Save changes/ })
    ).toBeInTheDocument()
  })

  it('should clear validation error when user starts editing the field', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Try to submit without title
    const submitButton = screen.getByRole('button', { name: /Add gift/ })
    await user.click(submitButton)

    // Error should be visible
    expect(screen.getByText('Title is required')).toBeInTheDocument()

    // Type in the title field
    const titleInput = screen.getByPlaceholderText('What do you want?')
    await user.type(titleInput, 'A')

    // Error should be cleared
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument()
  })

  it('should close modal when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Cancel/ })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('should close modal when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { container } = render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const backdrop = container.querySelector('.modal-backdrop')
    await user.click(backdrop)

    expect(onClose).toHaveBeenCalled()
  })

  it('should not close modal when modal-sheet is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { container } = render(
      <GiftFormModal
        gift={undefined}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const modalSheet = container.querySelector('.modal-sheet')
    await user.click(modalSheet)

    expect(onClose).not.toHaveBeenCalled()
  })
})
