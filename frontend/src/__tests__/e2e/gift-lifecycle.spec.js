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
 * The seed assumption still holds: at least one user must exist, otherwise
 * UserSelect shows the first-run "Create admin account" setup form.
 * User is logged in and on the Gift List screen.
 *
 * The gift form and delete confirmation are bottom sheets (.sheet): inputs are
 * found by placeholder, checkboxes are custom .sheet__check-row elements toggled
 * by clicking the row, and Price (type=number) is REQUIRED — every gift creation
 * must fill it or submission fails with the inline error "Price is required".
 */

/** Ensure a custom sheet checkbox row (.sheet__check-row) ends up unchecked. */
async function ensureCheckRowUnchecked(page, label) {
  const row = page.locator('.sheet__check-row', { hasText: label })
  const isChecked = (await row.locator('.sheet__check-box--checked').count()) > 0
  if (isChecked) {
    await row.click()
  }
}

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

    // Wait for gift list page to load; own list header reads "My gift list"
    await expect(page).toHaveURL('/list/me')
    await expect(page.locator('.topbar__title')).toContainText('My gift list')
  })

  test('should add a new gift, verify it appears, edit it, and delete it', async ({ page }) => {
    // Step 1: Click "Add a gift idea" button
    const addButton = page.locator('.gift-list__add-button')
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Step 2: Verify the add sheet is open
    const modalTitle = page.locator('.sheet__title')
    await expect(modalTitle).toContainText('Add a gift idea')

    // Step 3: Fill in the form (sheet inputs are located by placeholder)
    const titleInput = page.getByPlaceholder('e.g. Wool socks')
    const linkInput = page.getByPlaceholder('https://...')
    const priceInput = page.getByPlaceholder('e.g. 25')
    const descriptionInput = page.getByPlaceholder('Any extra detail...')

    const testGift = {
      title: 'Test Gift - E2E',
      link: 'https://example.com/test-product',
      price: '99.99', // Price input is type=number — digits only, rendered as €99.99
      description: 'This is a test gift for E2E testing',
    }

    await titleInput.fill(testGift.title)
    await linkInput.fill(testGift.link)
    await priceInput.fill(testGift.price)
    await descriptionInput.fill(testGift.description)

    // Uncheck "Only give this once" (custom check row — click the row to toggle)
    await ensureCheckRowUnchecked(page, 'Only give this once')

    // Step 4: Submit the form
    const addGiftButton = page.getByRole('button', { name: 'Add gift', exact: true })
    await addGiftButton.click()

    // Step 5: Verify the sheet closes and gift appears in the list
    await expect(modalTitle).not.toBeVisible()

    // Wait for the gift to appear in the active gifts section
    const giftCards = page.locator('.gift-card')
    const giftCount = await giftCards.count()
    expect(giftCount).toBeGreaterThan(0)

    // Find the newly added gift by title
    const newGiftCard = page.locator(`.gift-card:has-text("${testGift.title}")`)
    await expect(newGiftCard).toBeVisible()

    // Verify the gift content is displayed correctly (price renders with a € prefix)
    await expect(newGiftCard).toContainText(testGift.title)
    await expect(newGiftCard.locator('.gift-card__price')).toContainText(`€${testGift.price}`)
    await expect(newGiftCard).toContainText(testGift.description)

    // Every card shows a cover (fetched image or placeholder SVG)
    await expect(newGiftCard.locator('.gift-card__cover')).toBeVisible()

    // Verify the link is present
    const giftLink = newGiftCard.locator('a:has-text("View item")')
    await expect(giftLink).toBeVisible()
    const href = await giftLink.getAttribute('href')
    expect(href).toBe(testGift.link)

    // Verify the "Can give more than once" tag is shown (since we unchecked "Only give this once")
    const repeatableTag = newGiftCard.locator('span:has-text("Can give more than once")')
    await expect(repeatableTag).toBeVisible()

    // Step 6: Edit the gift
    const editButton = newGiftCard.locator('button[title="Edit"]')
    await expect(editButton).toBeVisible()
    await editButton.click()

    // Step 7: Verify the edit sheet is open with pre-filled data
    const editModalTitle = page.locator('.sheet__title')
    await expect(editModalTitle).toContainText('Edit gift idea')

    const editTitleInput = page.getByPlaceholder('e.g. Wool socks')
    const editDescriptionInput = page.getByPlaceholder('Any extra detail...')

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
    const saveButton = page.getByRole('button', { name: 'Save changes' })
    await saveButton.click()

    // Step 10: Verify the sheet closes and changes are reflected
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

    // Step 12: Verify the delete confirmation sheet appears
    const confirmSheet = page.locator('.sheet')
    await expect(confirmSheet).toBeVisible()

    const confirmTitle = page.locator('.sheet__title')
    await expect(confirmTitle).toHaveText('Remove this gift idea?')
    await expect(page.locator('.sheet__text')).toContainText(
      `"${updatedGiftTitle}" will be removed from the list for good.`
    )

    // Step 13: Confirm the deletion via the danger button ("Remove")
    const removeButton = page.locator('.sheet__btn--danger')
    await expect(removeButton).toHaveText('Remove')
    await removeButton.click()

    // Step 14: Verify the sheet closes
    await expect(confirmSheet).not.toBeVisible()

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

    // Verify sheet is open
    const modalTitle = page.locator('.sheet__title')
    await expect(modalTitle).toContainText('Add a gift idea')

    // Fill form but don't submit
    const titleInput = page.getByPlaceholder('e.g. Wool socks')
    await titleInput.fill('This will be cancelled')

    // Click cancel
    const cancelButton = page.locator('.sheet__btn--cancel')
    await cancelButton.click()

    // Verify sheet closes
    await expect(modalTitle).not.toBeVisible()

    // Verify gift count hasn't changed
    const finalCount = await giftCards.count()
    expect(finalCount).toBe(initialCount)
  })

  test('should cancel delete operation when clicking cancel in confirmation', async ({ page }) => {
    // Create a gift first (title AND price are required)
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    await page.getByPlaceholder('e.g. Wool socks').fill('Gift to cancel delete')
    await page.getByPlaceholder('e.g. 25').fill('10')

    const addGiftButton = page.getByRole('button', { name: 'Add gift', exact: true })
    await addGiftButton.click()

    // Wait for gift to appear
    const newGiftCard = page.locator('.gift-card:has-text("Gift to cancel delete")')
    await expect(newGiftCard).toBeVisible()

    // Click delete button
    const deleteButton = newGiftCard.locator('button[title="Delete"]')
    await deleteButton.click()

    // Verify confirmation sheet is open
    const confirmSheet = page.locator('.sheet')
    await expect(confirmSheet).toBeVisible()
    await expect(page.locator('.sheet__title')).toHaveText('Remove this gift idea?')

    // Click cancel
    const cancelButton = page.locator('.sheet__btn--cancel')
    await cancelButton.click()

    // Verify sheet closes
    await expect(confirmSheet).not.toBeVisible()

    // Verify gift is still visible
    await expect(newGiftCard).toBeVisible()

    // Clean up: actually delete the test gift
    await deleteButton.click()
    await expect(confirmSheet).toBeVisible()
    await page.locator('.sheet__btn--danger').click()
    await expect(newGiftCard).not.toBeVisible()
  })

  test('should handle gift with all optional fields empty', async ({ page }) => {
    // Click add button
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    // Fill only the required fields: Title and Price (link/notes stay empty)
    const testTitle = 'Minimal Gift'
    await page.getByPlaceholder('e.g. Wool socks').fill(testTitle)
    await page.getByPlaceholder('e.g. 25').fill('5')

    // Submit without filling optional fields
    const addGiftButton = page.getByRole('button', { name: 'Add gift', exact: true })
    await addGiftButton.click()

    // Verify gift appears
    const giftCard = page.locator(`.gift-card:has-text("${testTitle}")`)
    await expect(giftCard).toBeVisible()

    // Verify the title and euro-prefixed price are shown
    await expect(giftCard).toContainText(testTitle)
    await expect(giftCard.locator('.gift-card__price')).toContainText('€5')

    // Verify the "View item" link is not present (no link provided)
    const viewLink = giftCard.locator('a:has-text("View item")')
    await expect(viewLink).not.toBeVisible()

    // A placeholder SVG cover is still rendered when there is no link/image
    await expect(giftCard.locator('svg.gift-card__cover')).toBeVisible()

    // Clean up: delete the test gift via the confirmation sheet
    const deleteButton = giftCard.locator('button[title="Delete"]')
    await deleteButton.click()

    const removeButton = page.locator('.sheet__btn--danger')
    await removeButton.click()

    await expect(giftCard).not.toBeVisible()
  })

  test('should display validation errors for missing title and price', async ({ page }) => {
    // Click add button
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    // Don't fill the title field
    const addGiftButton = page.getByRole('button', { name: 'Add gift', exact: true })
    await addGiftButton.click()

    // Verify title validation error is shown inline in the sheet
    const errorMessage = page.locator('.sheet__error')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('Title is required')

    // Fill the title but leave price empty — price is now required too
    await page.getByPlaceholder('e.g. Wool socks').fill('Gift missing a price')
    await addGiftButton.click()

    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('Price is required')

    // Verify sheet is still open
    const modalTitle = page.locator('.sheet__title')
    await expect(modalTitle).toContainText('Add a gift idea')

    // Close it without creating anything
    await page.locator('.sheet__btn--cancel').click()
    await expect(modalTitle).not.toBeVisible()
  })

  test('should update gift with exact color and product tags', async ({ page }) => {
    // Click add button
    const addButton = page.locator('.gift-list__add-button')
    await addButton.click()

    // Fill required fields
    await page.getByPlaceholder('e.g. Wool socks').fill('Colored Gift')
    await page.getByPlaceholder('e.g. 25').fill('15')

    // Check the exact color and exact product custom check rows (click to toggle)
    await page.locator('.sheet__check-row', { hasText: 'Must be this exact color' }).click()
    await page.locator('.sheet__check-row', { hasText: 'Must be this exact product / brand' }).click()

    // Submit
    const addGiftButton = page.getByRole('button', { name: 'Add gift', exact: true })
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

    const removeButton = page.locator('.sheet__btn--danger')
    await removeButton.click()

    await expect(giftCard).not.toBeVisible()
  })
})
