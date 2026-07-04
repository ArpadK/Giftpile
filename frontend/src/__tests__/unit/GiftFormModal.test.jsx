import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GiftFormModal } from '../../components/GiftFormModal'

// Helper: find the clickable check-row that contains the given label text,
// and return the row plus its visual check-box element.
function getCheckRow(labelText) {
  const label = screen.getByText(labelText)
  const row = label.closest('.sheet__check-row')
  const box = row.querySelector('.sheet__check-box')
  return { row, box }
}

function isChecked(box) {
  return box.classList.contains('sheet__check-box--checked')
}

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
    expect(screen.getByText('Add a gift idea')).toBeInTheDocument()

    // Check all input fields are empty
    expect(screen.getByPlaceholderText('e.g. Wool socks')).toHaveValue('')
    expect(screen.getByPlaceholderText('https://...')).toHaveValue('')
    expect(screen.getByPlaceholderText('e.g. 25')).toHaveValue(null)
    expect(screen.getByPlaceholderText('Any extra detail...')).toHaveValue('')

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

    // "Only give this once" is checked by default
    const { box: onlyOnceBox } = getCheckRow('Only give this once')
    expect(isChecked(onlyOnceBox)).toBe(true)

    // Other checkboxes should not be checked by default
    const { box: exactColorBox } = getCheckRow('Must be this exact color')
    const { box: exactProductBox } = getCheckRow('Must be this exact product / brand')
    expect(isChecked(exactColorBox)).toBe(false)
    expect(isChecked(exactProductBox)).toBe(false)
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
    const titleInput = screen.getByPlaceholderText('e.g. Wool socks')
    await user.type(titleInput, 'PlayStation 5')

    // Fill in some optional fields
    const linkInput = screen.getByPlaceholderText('https://...')
    await user.type(linkInput, 'https://amazon.com/ps5')

    const priceInput = screen.getByPlaceholderText('e.g. 25')
    await user.type(priceInput, '499')

    const descriptionInput = screen.getByPlaceholderText('Any extra detail...')
    await user.type(descriptionInput, 'The newer model')

    // Toggle one of the optional checkboxes by clicking its row (via the label)
    await user.click(screen.getByText('Must be this exact product / brand'))

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Add gift/ })
    await user.click(submitButton)

    // Verify onSave was called with correct data
    expect(onSave).toHaveBeenCalledWith({
      title: 'PlayStation 5',
      link: 'https://amazon.com/ps5',
      price: '499',
      description: 'The newer model',
      exactColor: false,
      exactProduct: true,
      onlyOnce: true,
      type: 'GIFT', // default
    })
  })

  it('should pre-fill fields in edit mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const existingGift = {
      title: 'iPhone 15',
      link: 'https://apple.com/iphone',
      price: '999',
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
    expect(screen.getByText('Edit gift idea')).toBeInTheDocument()

    // Check that all fields are pre-filled
    expect(screen.getByPlaceholderText('e.g. Wool socks')).toHaveValue('iPhone 15')
    expect(screen.getByPlaceholderText('https://...')).toHaveValue(
      'https://apple.com/iphone'
    )
    expect(screen.getByPlaceholderText('e.g. 25')).toHaveValue(999)
    expect(screen.getByPlaceholderText('Any extra detail...')).toHaveValue(
      'Pro Max variant'
    )

    // Check that checkboxes are in correct state
    expect(isChecked(getCheckRow('Must be this exact color').box)).toBe(true)
    expect(isChecked(getCheckRow('Must be this exact product / brand').box)).toBe(true)
    expect(isChecked(getCheckRow('Only give this once').box)).toBe(false)

    // Check button text
    expect(
      screen.getByRole('button', { name: /Save changes/ })
    ).toBeInTheDocument()
  })

  it('should show the validation error only on empty submit and not clear on keystroke', async () => {
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

    // Error should be visible and onSave not called
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    // Typing does NOT clear the error (no per-keystroke clearing anymore)
    const titleInput = screen.getByPlaceholderText('e.g. Wool socks')
    await user.type(titleInput, 'A valid title')
    expect(screen.getByText('Title is required')).toBeInTheDocument()

    // Price is also required, so fill it before a valid submit.
    await user.type(screen.getByPlaceholderText('e.g. 25'), '25')

    // A valid submit still calls onSave (the component does not re-render the
    // error away, but the save goes through with the entered data)
    await user.click(submitButton)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'A valid title' })
    )
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

    const backdrop = container.querySelector('.sheet-backdrop')
    await user.click(backdrop)

    expect(onClose).toHaveBeenCalled()
  })

  it('should not close modal when sheet is clicked', async () => {
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

    const sheet = container.querySelector('.sheet')
    await user.click(sheet)

    expect(onClose).not.toHaveBeenCalled()
  })
})
