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
  const claims = gift.claims || []

  // Blind context (owner or admin viewing/editing owner's list): show all gifts
  if (isBlindContext) {
    return true
  }

  // No claims: always show the gift
  if (claims.length === 0) {
    return true
  }

  // Find if viewer has a claim on this gift
  const viewerClaim = claims.find(c => c.claimerUserId === viewerId)

  // If viewer is the claimer, always show
  if (viewerClaim) {
    return true
  }

  // If repeatable gift, show to all viewers
  if (!gift.onlyOnce) {
    return true
  }

  // Non-repeatable gift claimed by someone else:
  // Show only if it's considered effectively received
  for (const claim of claims) {
    if (claim.claimerUserId !== viewerId) {
      const isEffectivelyReceived = computeEffectiveReceived(gift, claim, today)
      if (!isEffectivelyReceived) {
        // Non-repeatable gift claimed by someone else and not yet received: hide it
        return false
      }
    }
  }

  // Non-repeatable gift claimed by someone else, but effectively received: show it
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
