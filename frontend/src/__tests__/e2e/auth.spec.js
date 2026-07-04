import { test, expect } from '@playwright/test'

/**
 * E2E tests for authentication flow.
 *
 * These tests verify:
 * - Full login flow: select user → enter password → arrive at Home screen
 * - Home screen displays "My gift list" card with gift count
 * - Logout from Home screen redirects to user-select
 *
 * Prerequisites: Backend running on http://localhost:8080 with test data.
 * The seed assumption still holds: at least one user must exist. With NO users,
 * UserSelect renders the first-run "Create admin account" setup form instead of
 * the "Who's this?" user picker these tests rely on.
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173') // Vite dev server default port
  })

  test('should complete full login flow: select user → password → Home', async ({ page }) => {
    // Step 1: Verify we're on UserSelect screen
    await expect(page).toHaveTitle(/.*/) // Basic check that page loaded
    await expect(page.locator('h1')).toContainText('Giftpile')
    await expect(page.locator('.subheading')).toContainText("Who's this?")

    // Step 2: Select a user from the list
    // First user row in the user list
    const userRows = page.locator('.user-row')
    const userCount = await userRows.count()
    expect(userCount).toBeGreaterThan(0)

    // Click the first user
    await userRows.first().click()

    // Step 3: Should navigate to login/:userId
    await expect(page).toHaveURL(/\/login\/\d+/)

    // Step 4: Verify PasswordStep screen loaded with user name
    const userNameHeader = page.locator('.password-step h1')
    await expect(userNameHeader).toBeVisible()
    const userName = await userNameHeader.textContent()
    expect(userName).toMatch(/Hi, \w+/) // "Hi, <username>"

    // Step 5: Enter password and sign in
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Use a valid test password (adjust based on your test backend setup)
    // Common test password - verify this matches your test data
    await passwordInput.fill('password')

    const submitButton = page.locator('button:has-text("Sign in")')
    await submitButton.click()

    // Step 6: Verify navigation to /home
    await expect(page).toHaveURL('/home')

    // Step 7: Verify Home screen loaded with expected content
    const homeTitle = page.locator('.topbar')
    await expect(homeTitle).toBeVisible()

    // Step 8: Verify "My gift list" card is visible
    const myGiftListCard = page.locator('.cta-card:has-text("My gift list")')
    await expect(myGiftListCard).toBeVisible()

    const cardTitle = page.locator('.cta-card__title')
    await expect(cardTitle).toContainText('My gift list')

    // Verify gift count is displayed (even if 0) — subtext reads "N ideas" (or "1 idea")
    const cardSubtext = page.locator('.cta-card__subtext')
    await expect(cardSubtext).toContainText(/\d+ ideas?/)
  })

  test('should display Home screen correctly after login with gift count', async ({ page }) => {
    // Navigate to UserSelect
    await page.goto('http://localhost:5173')

    // Select the first available user
    const userRows = page.locator('.user-row')
    await userRows.first().click()

    // Should be on login page
    await expect(page).toHaveURL(/\/login\/\d+/)

    // Enter password and submit
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('password')
    await page.locator('button:has-text("Sign in")').click()

    // Wait for navigation to home
    await expect(page).toHaveURL('/home')

    // Verify the "My gift list" card structure
    const myGiftListCard = page.locator('.cta-card')
    await expect(myGiftListCard).toBeVisible()

    // Check for card icon (an inline SVG gift glyph, not an emoji)
    const cardIcon = page.locator('.cta-card__icon')
    await expect(cardIcon).toBeVisible()
    await expect(cardIcon.locator('svg')).toBeVisible()

    // Check for card title
    const cardTitle = page.locator('.cta-card__title')
    await expect(cardTitle).toContainText('My gift list')

    // Check for subtext showing active gift count ("N ideas" / "1 idea")
    const cardSubtext = page.locator('.cta-card__subtext')
    const subtextContent = await cardSubtext.textContent()
    expect(subtextContent).toMatch(/\d+ ideas?/)

    // Verify the card is clickable (has chevron)
    const chevron = page.locator('.cta-card__chevron')
    await expect(chevron).toBeVisible()
  })

  test('should logout and return to user-select', async ({ page }) => {
    // Navigate to UserSelect
    await page.goto('http://localhost:5173')

    // Perform login
    const userRows = page.locator('.user-row')
    await userRows.first().click()

    await expect(page).toHaveURL(/\/login\/\d+/)

    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('password')
    await page.locator('button:has-text("Sign in")').click()

    // Wait for home page
    await expect(page).toHaveURL('/home')

    // Find and click logout button in TopBar (icon-only button with aria-label "Log out")
    const logoutButton = page.getByRole('button', { name: 'Log out' })
    await expect(logoutButton).toBeVisible()
    await logoutButton.click()

    // Should redirect to user-select
    await expect(page).toHaveURL('/')

    // Verify we're back on the UserSelect screen
    await expect(page.locator('h1')).toContainText('Giftpile')
    await expect(page.locator('.subheading')).toContainText("Who's this?")
  })

  test('should persist login session and show logged-in user on page reload', async ({ page }) => {
    // Navigate to UserSelect
    await page.goto('http://localhost:5173')

    // Perform login
    const userRows = page.locator('.user-row')
    const firstUserElement = userRows.first()
    const userNameBefore = await firstUserElement.locator('.user-row__name').textContent()

    await firstUserElement.click()

    await expect(page).toHaveURL(/\/login\/\d+/)

    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('password')
    await page.locator('button:has-text("Sign in")').click()

    // Wait for home page
    await expect(page).toHaveURL('/home')
    const homeHeaderBefore = await page.locator('.topbar').textContent()

    // Reload the page
    await page.reload()

    // Should still be on /home (session persisted)
    await expect(page).toHaveURL('/home')

    // Should still show logged-in user in header
    const homeHeaderAfter = await page.locator('.topbar').textContent()
    expect(homeHeaderAfter).toContain('Hi,')

    // My gift list card should still be visible
    const myGiftListCard = page.locator('.cta-card:has-text("My gift list")')
    await expect(myGiftListCard).toBeVisible()
  })
})
