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
 * The seed assumption still holds: with NO users, UserSelect renders the first-run
 * "Create admin account" setup form instead of the user picker these tests rely on.
 *
 * All admin modals are bottom sheets (.sheet inside .sheet-backdrop): UserFormModal,
 * DeleteUserConfirmModal, and AdminEditConfirmModal share .sheet__title, .sheet__input,
 * .sheet__error, and .sheet__btn--primary/--danger/--cancel buttons.
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

    // Step 6: Click "+ Add family member" button
    const addMemberBtn = page.locator('.add-user-btn')
    await expect(addMemberBtn).toBeVisible()
    await addMemberBtn.click()

    // Step 7: Verify the UserFormModal sheet opens for adding a new member
    const modalTitle = page.locator('.sheet__title')
    await expect(modalTitle).toContainText('Add family member')

    // Step 8: Fill in the form (sheet inputs are found by placeholder, not id)
    const nameInput = page.getByPlaceholder('Enter name')
    const passwordInputForm = page.getByPlaceholder('Enter password')
    const testMemberName = `TestMember_${Date.now()}`
    const testPassword = 'testPassword123'

    await nameInput.fill(testMemberName)
    await passwordInputForm.fill(testPassword)

    // Step 9: Submit the form (primary sheet button is labelled "Save")
    const saveMemberBtn = page.getByRole('button', { name: 'Save', exact: true })
    await saveMemberBtn.click()

    // Step 10: Verify modal closes and new member appears in the list
    await expect(modalTitle).not.toBeVisible()

    // Wait for the new user card to appear
    const newUserCard = page.locator(`.user-card:has-text("${testMemberName}")`)
    await expect(newUserCard).toBeVisible()

    // Verify user count increased
    const updatedUserCards = page.locator('.user-card')
    const updatedUserCount = await updatedUserCards.count()
    expect(updatedUserCount).toBe(initialUserCount + 1)

    // Step 11: Edit the newly added member (icon button, aria-label "Edit {name}")
    const editButton = newUserCard.getByRole('button', { name: `Edit ${testMemberName}` })
    await expect(editButton).toBeVisible()
    await editButton.click()

    // Step 12: Verify edit sheet opens
    const editModalTitle = page.locator('.sheet__title')
    await expect(editModalTitle).toContainText('Edit family member')

    // Step 13: Verify the form is pre-filled with current data
    const editNameInput = page.getByPlaceholder('Enter name')
    await expect(editNameInput).toHaveValue(testMemberName)

    // Step 14: Change the name
    const updatedMemberName = `UpdatedMember_${Date.now()}`
    await editNameInput.click({ clickCount: 3 })
    await editNameInput.fill(updatedMemberName)

    // Step 15: Save the changes (edit mode also uses the "Save" button)
    const saveChangesBtn = page.getByRole('button', { name: 'Save', exact: true })
    await saveChangesBtn.click()

    // Step 16: Verify modal closes and updated name is shown
    await expect(editModalTitle).not.toBeVisible()

    const updatedUserCard = page.locator(`.user-card:has-text("${updatedMemberName}")`)
    await expect(updatedUserCard).toBeVisible()

    // Old name should not be visible
    const oldUserCard = page.locator(`.user-card:has-text("${testMemberName}")`)
    await expect(oldUserCard).not.toBeVisible()

    // Step 17: Delete the member (icon button, aria-label "Delete {name}")
    const deleteButton = updatedUserCard.getByRole('button', { name: `Delete ${updatedMemberName}` })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Step 18: Verify the delete confirmation sheet appears
    const deleteSheet = page.locator('.sheet')
    await expect(deleteSheet).toBeVisible()

    const deleteSheetTitle = page.locator('.sheet__title')
    await expect(deleteSheetTitle).toContainText(`Remove ${updatedMemberName}?`)

    // Step 19: Verify the type-to-confirm input is present (placeholder = user name)
    const confirmInput = page.getByPlaceholder(updatedMemberName)
    await expect(confirmInput).toBeVisible()

    // Verify that the delete button is initially disabled (no input matched yet)
    const permanentlyDeleteBtn = page.getByRole('button', { name: 'Permanently delete' })
    await expect(permanentlyDeleteBtn).toBeDisabled()

    // Step 20: Type the member name to confirm deletion
    await confirmInput.fill(updatedMemberName)

    // Step 21: Verify the delete button is now enabled
    await expect(permanentlyDeleteBtn).toBeEnabled()

    // Step 22: Click the delete button to confirm
    await permanentlyDeleteBtn.click()

    // Step 23: Verify the sheet closes and user is removed from the list
    await expect(deleteSheet).not.toBeVisible()

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

    // Get all user names from the pre-login screen
    const userNames = await preLoginUserRows.locator('.user-row__name').allTextContents()

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
    const ownName = (await firstUserCard.locator('.user-card__name').textContent()).trim()

    const deleteButton = firstUserCard.getByRole('button', { name: `Delete ${ownName}` })
    await deleteButton.click()

    // The delete confirmation sheet appears with type-to-confirm
    const deleteSheet = page.locator('.sheet')
    await expect(deleteSheet).toBeVisible()
    await expect(page.locator('.sheet__title')).toContainText(`Remove ${ownName}?`)

    // The guardrail error only surfaces after the backend rejects the delete,
    // so type-to-confirm and attempt it.
    const confirmInput = page.getByPlaceholder(ownName)
    await expect(confirmInput).toBeVisible()
    await confirmInput.fill(ownName)

    const permanentlyDeleteBtn = page.getByRole('button', { name: 'Permanently delete' })
    await expect(permanentlyDeleteBtn).toBeEnabled()
    await permanentlyDeleteBtn.click()

    // Backend rejects self-delete ("Cannot delete your own account"); the error
    // renders in .sheet__error and replaces the type-to-confirm input.
    const errorMessage = page.locator('.sheet__error')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText(/cannot|self|own/i)

    // The type-to-confirm input is hidden while an error is shown
    await expect(page.getByPlaceholder(ownName)).not.toBeVisible()

    // And the delete button is disabled due to the error
    await expect(permanentlyDeleteBtn).toBeDisabled()

    // Cancel the sheet
    const cancelButton = page.locator('.sheet__btn--cancel')
    await cancelButton.click()

    await expect(deleteSheet).not.toBeVisible()

    // The user we tried to delete is still listed
    await expect(page.locator(`.user-card:has-text("${ownName}")`).first()).toBeVisible()
  })
})
