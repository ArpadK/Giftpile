import { test, expect } from '@playwright/test'

/**
 * E2E tests for the admin flow.
 *
 * These tests verify:
 * - Admin logs in successfully
 * - Admin opens the Admin panel
 * - Admin adds a new family member with name and password
 * - Admin edits the family member (changes name)
 * - Admin deletes the family member with type-to-confirm
 * - Deleted user no longer appears on pre-login screen (UserSelect)
 *
 * Prerequisites: Backend running on http://localhost:8080 with test data including at least one admin user.
 */

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')
  })

  test('should complete admin flow: login → Admin panel → add member → edit → delete type-to-confirm → not on pre-login', async ({ page }) => {
    // Step 1: Login as admin user
    // First, get the list of users to find an admin
    await page.goto('http://localhost:5173')

    // Select the first user (assuming it's an admin for this test)
    const userRows = page.locator('.user-row')
    const userCount = await userRows.count()
    expect(userCount).toBeGreaterThan(0)

    // Click the first user
    await userRows.first().click()

    // Wait for login page
    await expect(page).toHaveURL(/\/login\/\d+/)

    // Enter password and login
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('password')
    await page.locator('button:has-text("Sign in")').click()

    // Step 2: Verify we're on Home screen
    await expect(page).toHaveURL('/home')
    await expect(page.locator('.topbar')).toContainText('Hi,')

    // Step 3: Navigate to Admin panel
    // "Manage" is a section label (h3.section-label); the clickable nav element is
    // the .admin-row card underneath it (rendered only for admins).
    const adminRow = page.locator('.admin-row')
    await expect(adminRow).toBeVisible()
    await adminRow.click()

    // Step 4: Verify we're on Admin panel
    await expect(page).toHaveURL('/admin')
    await expect(page.locator('.topbar')).toContainText('Admin')

    // Step 5: Get initial user count to verify new member was added
    const initialUserCards = page.locator('.user-card')
    const initialUserCount = await initialUserCards.count()

    // Step 6: Click "Add family member" button
    const addMemberBtn = page.locator('.add-user-btn')
    await expect(addMemberBtn).toBeVisible()
    await addMemberBtn.click()

    // Step 7: Verify UserFormModal opens for adding new member
    const modalTitle = page.locator('.modal-sheet__title')
    await expect(modalTitle).toContainText('Add family member')

    // Step 8: Fill in the form with test data
    const nameInput = page.locator('input#name')
    const passwordInputForm = page.locator('input#password')
    const testMemberName = `TestMember_${Date.now()}`
    const testPassword = 'testPassword123'

    await nameInput.fill(testMemberName)
    await passwordInputForm.fill(testPassword)

    // Step 9: Submit the form
    const addMemberFormBtn = page.locator('button:has-text("Add member")')
    await addMemberFormBtn.click()

    // Step 10: Verify modal closes and new member appears in the list
    await expect(modalTitle).not.toBeVisible()

    // Wait for the new user card to appear
    const newUserCard = page.locator(`.user-card:has-text("${testMemberName}")`)
    await expect(newUserCard).toBeVisible()

    // Verify user count increased
    const updatedUserCards = page.locator('.user-card')
    const updatedUserCount = await updatedUserCards.count()
    expect(updatedUserCount).toBe(initialUserCount + 1)

    // Step 11: Edit the newly added member
    const editButton = newUserCard.locator('button[title="Edit user"]')
    await expect(editButton).toBeVisible()
    await editButton.click()

    // Step 12: Verify edit modal opens
    const editModalTitle = page.locator('.modal-sheet__title')
    await expect(editModalTitle).toContainText('Edit family member')

    // Step 13: Verify the form is pre-filled with current data
    const editNameInput = page.locator('input#name')
    await expect(editNameInput).toHaveValue(testMemberName)

    // Step 14: Change the name
    const updatedMemberName = `UpdatedMember_${Date.now()}`
    await editNameInput.click({ clickCount: 3 })
    await editNameInput.fill(updatedMemberName)

    // Step 15: Save the changes
    const saveChangesBtn = page.locator('button:has-text("Save changes")')
    await saveChangesBtn.click()

    // Step 16: Verify modal closes and updated name is shown
    await expect(editModalTitle).not.toBeVisible()

    const updatedUserCard = page.locator(`.user-card:has-text("${updatedMemberName}")`)
    await expect(updatedUserCard).toBeVisible()

    // Old name should not be visible
    const oldUserCard = page.locator(`.user-card:has-text("${testMemberName}")`)
    await expect(oldUserCard).not.toBeVisible()

    // Step 17: Delete the member
    const deleteButton = updatedUserCard.locator('button[title="Delete user"]')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Step 18: Verify delete confirmation dialog appears
    const deleteDialog = page.locator('.confirm-dialog')
    await expect(deleteDialog).toBeVisible()

    const deleteDialogTitle = page.locator('.confirm-dialog__title')
    await expect(deleteDialogTitle).toContainText('Delete user?')

    // Step 19: Verify the confirmation input field is present and focused
    const confirmInput = page.locator('.confirm-dialog__input')
    await expect(confirmInput).toBeVisible()

    // Verify that the delete button is initially disabled (no input matched yet)
    const permanentlyDeleteBtn = page.locator('button:has-text("Permanently delete")')
    const isInitiallyDisabled = await permanentlyDeleteBtn.isDisabled()
    expect(isInitiallyDisabled).toBe(true)

    // Step 20: Type the member name to confirm deletion
    await confirmInput.fill(updatedMemberName)

    // Step 21: Verify the delete button is now enabled
    const isEnabled = await permanentlyDeleteBtn.isDisabled()
    expect(isEnabled).toBe(false)

    // Step 22: Click the delete button to confirm
    await permanentlyDeleteBtn.click()

    // Step 23: Verify the dialog closes and user is removed from the list
    await expect(deleteDialog).not.toBeVisible()

    const deletedUserCard = page.locator(`.user-card:has-text("${updatedMemberName}")`)
    await expect(deletedUserCard).not.toBeVisible()

    // Verify user count decreased back to initial
    const finalUserCards = page.locator('.user-card')
    const finalUserCount = await finalUserCards.count()
    expect(finalUserCount).toBe(initialUserCount)

    // Step 24: Logout and return to pre-login screen (UserSelect)
    // TopBar back/logout are icon-only buttons; target their aria-labels.
    const backButton = page.getByRole('button', { name: 'Back' })
    await backButton.click()

    // Should be back on Home
    await expect(page).toHaveURL('/home')

    // Logout
    const logoutButton = page.getByRole('button', { name: 'Log out' })
    await logoutButton.click()

    // Should be back on UserSelect
    await expect(page).toHaveURL('/')

    // Step 25: Verify the deleted member is NOT in the user list on pre-login
    const preLoginUserRows = page.locator('.user-row')
    const preLoginUserCount = await preLoginUserRows.count()

    // Get all user names from the pre-login screen
    const userNames = await preLoginUserRows.locator('.user-name').allTextContents()

    // Verify the deleted member is not in the list
    expect(userNames).not.toContain(updatedMemberName)
  })

  test('should not allow self-delete', async ({ page }) => {
    // Login as an admin
    await page.goto('http://localhost:5173')

    const userRows = page.locator('.user-row')
    await userRows.first().click()

    await expect(page).toHaveURL(/\/login\/\d+/)

    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('password')
    await page.locator('button:has-text("Sign in")').click()

    await expect(page).toHaveURL('/home')

    // Navigate to Admin panel (the .admin-row card, not the "Manage" section label)
    const adminRow = page.locator('.admin-row')
    await adminRow.click()

    await expect(page).toHaveURL('/admin')

    // Try to delete the currently logged-in user
    // Get the first admin user (should be the one we're logged in as)
    const firstUserCard = page.locator('.user-card').first()
    const deleteButton = firstUserCard.locator('button[title="Delete user"]')
    await deleteButton.click()

    // Verify error message appears in the delete dialog
    const deleteDialog = page.locator('.confirm-dialog')
    await expect(deleteDialog).toBeVisible()

    const errorMessage = page.locator('.confirm-dialog__error')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText(/cannot|self|own/i)

    // Verify there's no input field when there's an error
    const confirmInput = page.locator('.confirm-dialog__input')
    await expect(confirmInput).not.toBeVisible()

    // Verify delete button is disabled due to error
    const permanentlyDeleteBtn = page.locator('button:has-text("Permanently delete")')
    const isDisabled = await permanentlyDeleteBtn.isDisabled()
    expect(isDisabled).toBe(true)

    // Cancel the dialog
    const cancelButton = page.locator('.confirm-dialog__btn--cancel')
    await cancelButton.click()

    await expect(deleteDialog).not.toBeVisible()
  })
})
