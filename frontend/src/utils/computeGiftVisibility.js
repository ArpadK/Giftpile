/**
 * Client-side gift visibility utility — mirrors backend GiftVisibilityService logic.
 *
 * Computes visibility rules for gifts based on:
 * - Blind context (owner viewing own list): all gifts shown, no claim data exposed
 * - Non-repeatable claimed-by-others (non-blind): gift hidden until effectiveReceived
 * - Repeatable gifts: shown to all, only viewer's own claim exposed
 * - effectiveReceived: gift.manualReceived OR (onlyOnce && today > claim.giftDate)
 */

/**
 * Compute if a gift is effectively received.
 *
 * A gift is effectively received if:
 * - It's manually marked as received, OR
 * - It's non-repeatable AND a claim exists AND today is after the claim's gift date
 *
 * @param {object} gift - the gift object with { manualReceived, onlyOnce, ... }
 * @param {object|null} claim - the claim object with { giftDate }, or null if no claim
 * @param {Date} today - the current date (defaults to new Date())
 * @returns {boolean} true if the gift is effectively received
 */
export function computeEffectiveReceived(gift, claim, today = new Date()) {
  // Manual received flag always counts as received
  if (gift.manualReceived) {
    return true
  }

  // For non-repeatable gifts: received if today is after the claim date
  if (gift.onlyOnce && claim != null) {
    // Parse claim.giftDate if it's a string (ISO format or other)
    const claimDate = typeof claim.giftDate === 'string'
      ? new Date(claim.giftDate)
      : claim.giftDate

    // Normalize today to midnight for fair comparison
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const claimDateNormalized = new Date(claimDate.getFullYear(), claimDate.getMonth(), claimDate.getDate())

    if (todayNormalized > claimDateNormalized) {
      return true
    }
  }

  return false
}

/**
 * Determine if a gift should be shown to a viewer based on visibility rules.
 *
 * @param {object} gift - the gift object
 * @param {number} viewerId - the ID of the viewer
 * @param {number} ownerId - the ID of the gift list owner
 * @param {boolean} isBlindContext - true if viewer is owner/admin editing owner's list
 * @param {Date} today - the current date (defaults to new Date())
 * @returns {boolean} true if the gift should be shown to the viewer
 */
export function shouldShowGift(gift, viewerId, ownerId, isBlindContext, today = new Date()) {
  // Blind context (owner viewing own list, or admin editing it): show everything.
  // Received gifts are only ever visible in this context.
  if (isBlindContext) {
    return true
  }

  const claims = gift.claims || []

  // The claimer always sees their own claim (even after it resolves) so they can edit/undo it.
  if (claims.some(c => c.claimerUserId === viewerId)) {
    return true
  }

  // Gifts the owner marked as received are private to the owner — never shown to others.
  if (gift.manualReceived) {
    return false
  }

  // Repeatable gifts stay available to everyone regardless of others' claims.
  if (!gift.onlyOnce) {
    return true
  }

  // Non-repeatable gift claimed by someone else: hidden from other viewers, both before and
  // after the gift date resolves it to "received" (received items stay private to the owner).
  if (claims.some(c => c.claimerUserId !== viewerId)) {
    return false
  }

  // Unclaimed, not received: available to view and claim.
  return true
}

/**
 * Filter a list of gifts based on visibility rules for a specific viewer.
 *
 * @param {array} gifts - the list of gifts to filter
 * @param {number} viewerId - the ID of the viewer
 * @param {number} ownerId - the ID of the gift list owner
 * @param {boolean} isBlindContext - true if viewer is owner/admin editing owner's list
 * @param {Date} today - the current date (defaults to new Date())
 * @returns {array} filtered list of gifts with visibility rules applied
 */
export function computeGiftVisibility(gifts, viewerId, ownerId, isBlindContext, today = new Date()) {
  return gifts.filter(gift => shouldShowGift(gift, viewerId, ownerId, isBlindContext, today))
}
