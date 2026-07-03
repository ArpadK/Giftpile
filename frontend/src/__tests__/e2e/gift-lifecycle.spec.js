import { test, expect } from '@playwright/test'

/**
 * E2E tests for the complete gift lifecycle.
 *
 * These tests verify:
 * - Add gift: form submission → gift appears in list
 * - Edit gift: open modal → change fields → save → changes reflected
 * - Delete gift: open delete confirmation → confirm → gift removed from list
 *
 * Prerequisites: Backend running on http://localhost:8080 with test data.
 * User is logged in and on the Gift List screen.
 */

test.describe('Gift Lifecycle', () => {
  let userId

  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login
    await page.goto('http://localhost:5173')

    // Select the first user
    const userRows = page.locator('.user-row')
    await userRows.first().click()

    // Wait for login page
    await expect(page).toHaveURL(/\/login\/\d+/)

    // Extract userId from URL
    const url = page.url()
    const match = url.match(/\/login\/(\d+)/)
    if (match) {
      userId = parseInt(match[1])
    }

    // Enter password and login
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('password')
    await page.locator('button:has-text("Sign in")').click()

    // Wait for home page
    await expect(page).toHaveURL('/home')

    // Navigate to gift list. The "My gift list" CTA navigates to the literal
    // /list/me route (owner view), NOT /list/<id>.
    const myGiftListCard = page.locator('.cta-card:has-text("My gift list")')
    await myGiftListCard.click()

    // Wait for gift list page to load
    await expect(page).toHaveURL('/list/me')
    await expect(page.locator('.topbar')).toContainText('My gift list')
  })

  test('should add a new gift, verify it appears, edit it, and delete it', async ({ page }) => {
    // Step 1: Click "Add a gift idea" button
    const addButton = page.locator('.gift-list__add-button')
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Step 2: Verify the add modal is open
    const modalTitle = page.locator('.modal-sheet__title')
    await expect(modalTitle).toContainText('Add a gift idea')

    // Step 3: Fill in the form with test data
    const titleInput = page.locator('input#title')
    const linkInput = page.locator('input#link')
    const priceInput = page.locator('input#price')
    const descriptionInput = page.locator('textarea#description')

    const testGift = {
      title: 'Test Gift - E2E',
      link: 'https://example.com/test-product',
      price: '$99.99',
      description: 'This is a test gift for E2E testing',
    }

    await titleInput.fill(testGift.title)
    await linkInput.fill(testGift.link)
    await priceInput.fill(testGift.price)
    await descriptionInput.fill(testGift.description)

    // Uncheck "Only give this once" to make it repeatable
    const onlyOnceCheckbox = page.locator('input[name="onlyOnce"]')
    const isChecked = await onlyOnceCheckbox.isChecked()
    if (isChecked) {
      await onlyOnceCheckbox.click()
    }

    // Step 4: Submit the form
    const addGiftButton = page.locator('button:has-text("Add gift")')
    await addGiftButton.click()

    // Step 5: Verify the modal closes and gift appears in the list
    await expect(modalTitle).not.toBeVisible()

    // Wait for the gift to appear in the active gifts section
    const giftCards = page.locator('.gift-card')
    const giftCount = await giftCards.count()
    expect(giftCount).toBeGreaterThan(0)

    // Find the newly added gift by title
    const newGiftCard = page.locator(`.gift-card:has-text("${testGift.title}")`)
    await expect(newGiftCard).toBeVisible()

    // Verify the gift content is displayed correctly
    await expect(newGiftCard).toContainText(testGift.title)
    await expect(newGiftCard).toContainText(testGift.price)
    await expect(newGiftCard).toContainText(testGift.description)

    // Verify the link is present
    const giftLink = newGiftCard.locator('a:has-text("View item")')
    await expect(giftLink).toBeVisible()
    const href = await giftLink.getAttribute('href')
    expect(href).toBe(testGift.link)

    // Verify the "Repeatable" tag is shown (since we unchecked "Only give this once")
    const repeatableTag = newGiftCard.locator('span:has-text("Repeatable")')
    await expect(repeatableTag).toBeVisible()

    // Step 6: Edit the gift
    const editButton = newGiftCard.locator('button[title="Edit"]')
    await expect(editButton).toBeVisible()
    await editButton.click()

    // Step 7: Verify the edit modal is open with pre-filled data
    const editModalTitle = page.locator('.modal-sheet__title')
    await expect(editModalTitle).toContainText('Edit gift idea')

    const editTitleInput = page.locator('input#title')
    const editDescriptionInput = page.locator('textarea#description')

    // Verify pre-filled values
    await expect(editTitleInput).toHaveValue(testGift.title)
    await expect(editDescriptionInput).toHaveValue(testGift.description)

    // Step 8: Edit the gift data
    const updatedGiftTitle = 'Updated Test Gift - E2E'
    const updatedDescription = 'This is the updated description for testing'

    await editTitleInput.click({ clickCount: 3 })
    await editTitleInput.fill(updatedGiftTitle)
    await editDescriptionInput.click({ clickCount: 3 })
    await editDescriptionInput.fill(updatedDescription)

    // Step 9: Save the changes
    const saveButton = page.locator('button:has-text("Save changes")')
    await saveButton.click()

    // Step 10: Verify the modal closes and changes are reflected
    await expect(editModalTitle).not.toBeVisible()

    // Verify the updated gift appears in the list with new data
    const updatedGiftCard = page.locator(`.gift-card:has-text("${updatedGiftTitle}")`)
    await expect(updatedGiftCard).toBeVisible()
    await expect(updatedGiftCard).toContainText(updatedDescription)

    // The old title should no longer be visible
    const oldGiftCard = page.locator(`.gift-card:has-text("${testGift.title}")`)
    await expect(oldGiftCard).not.toBeVisible()

    // Step 11: Delete the gift - click delete button
    const deleteButton = updatedGiftCard.locator('button[title="Delete"]')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Step 12: Verify the delete confirmation dialog appears
    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toBeVisible()

    const confirmTitle = page.locator('.confirm-dialog__title')
    await expect(confirmTitle).toContainText(`Delete "${updatedGiftTitle}"?`)

    // Step 13: Confirm the deletion
    const removeButton = page.locator('button:has-text("Remove")')
    await expect(removeButton).toBeVisible()
    await removeButton.click()

    // Step 14: Verify the dialog closes
    await expect(confirmDialog).not.toBeVisible()

    // Step 15: Verify the gift is removed from the list
    await expect(updatedGiftCard).not.toBeVisible()
    await expect(page.locator(`.gift-card:has-text("${updatedGiftTitle}")`)).not.toBeVisible()
  })

  test('should cancel add operation when clicking cancel button', async ({ page }) => {
    // Get initial gift count
    const giftCards = page.locator('.gift-card')
    const initialCount = await giftCards.count()

    // Click add button
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    // Verify modal is open
    const modalTitle = page.locator('.modal-sheet__title')
    await expect(modalTitle).toContainText('Add a gift idea')

    // Fill form but don't submit
    const titleInput = page.locator('input#title')
    await titleInput.fill('This will be cancelled')

    // Click cancel
    const cancelButton = page.locator('button:has-text("Cancel")').first()
    await cancelButton.click()

    // Verify modal closes
    await expect(modalTitle).not.toBeVisible()

    // Verify gift count hasn't changed
    const finalCount = await giftCards.count()
    expect(finalCount).toBe(initialCount)
  })

  test('should cancel delete operation when clicking cancel in confirmation', async ({ page }) => {
    // Create a gift first
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    const titleInput = page.locator('input#title')
    await titleInput.fill('Gift to cancel delete')

    const addGiftButton = page.locator('button:has-text("Add gift")')
    await addGiftButton.click()

    // Wait for gift to appear
    const newGiftCard = page.locator('.gift-card:has-text("Gift to cancel delete")')
    await expect(newGiftCard).toBeVisible()

    // Click delete button
    const deleteButton = newGiftCard.locator('button[title="Delete"]')
    await deleteButton.click()

    // Verify confirmation dialog is open
    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toBeVisible()

    // Click cancel
    const cancelButton = page.locator('.confirm-dialog .btn.secondary')
    await cancelButton.click()

    // Verify dialog closes
    await expect(confirmDialog).not.toBeVisible()

    // Verify gift is still visible
    await expect(newGiftCard).toBeVisible()
  })

  test('should handle gift with all optional fields empty', async ({ page }) => {
    // Click add button
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    // Fill only the required title field
    const titleInput = page.locator('input#title')
    const testTitle = 'Minimal Gift'
    await titleInput.fill(testTitle)

    // Submit without filling optional fields
    const addGiftButton = page.locator('button:has-text("Add gift")')
    await addGiftButton.click()

    // Verify gift appears
    const giftCard = page.locator(`.gift-card:has-text("${testTitle}")`)
    await expect(giftCard).toBeVisible()

    // Verify only the title is shown (no price, description, or link)
    await expect(giftCard).toContainText(testTitle)

    // Verify the "View item" link is not present (no link provided)
    const viewLink = giftCard.locator('a:has-text("View item")')
    await expect(viewLink).not.toBeVisible()

    // Clean up: delete the test gift
    const deleteButton = giftCard.locator('button[title="Delete"]')
    await deleteButton.click()

    const removeButton = page.locator('button:has-text("Remove")')
    await removeButton.click()

    await expect(giftCard).not.toBeVisible()
  })

  test('should display validation error when submitting empty title', async ({ page }) => {
    // Click add button
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    // Don't fill the title field
    const addGiftButton = page.locator('button:has-text("Add gift")')
    await addGiftButton.click()

    // Verify validation error is shown
    const errorMessage = page.locator('.form-field__error')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('Title is required')

    // Verify modal is still open
    const modalTitle = page.locator('.modal-sheet__title')
    await expect(modalTitle).toContainText('Add a gift idea')
  })

  test('should update gift with exact color and product tags', async ({ page }) => {
    // Click add button
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    // Fill form
    const titleInput = page.locator('input#title')
    await titleInput.fill('Colored Gift')

    // Check the exact color and exact product checkboxes
    const exactColorCheckbox = page.locator('input[name="exactColor"]')
    const exactProductCheckbox = page.locator('input[name="exactProduct"]')

    await exactColorCheckbox.click()
    await exactProductCheckbox.click()

    // Submit
    const addGiftButton = page.locator('button:has-text("Add gift")')
    await addGiftButton.click()

    // Verify tags are displayed
    const giftCard = page.locator('.gift-card:has-text("Colored Gift")')
    await expect(giftCard).toBeVisible()

    const exactColorTag = giftCard.locator('span:has-text("Exact color")')
    const exactProductTag = giftCard.locator('span:has-text("Exact product")')

    await expect(exactColorTag).toBeVisible()
    await expect(exactProductTag).toBeVisible()

    // Clean up
    const deleteButton = giftCard.locator('button[title="Delete"]')
    await deleteButton.click()

    const removeButton = page.locator('button:has-text("Remove")')
    await removeButton.click()

    await expect(giftCard).not.toBeVisible()
  })
})
