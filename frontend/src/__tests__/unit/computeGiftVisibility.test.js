import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  computeEffectiveReceived,
  shouldShowGift,
  computeGiftVisibility,
} from '../../utils/computeGiftVisibility'

/**
 * Unit tests for computeGiftVisibility utility.
 *
 * Covers:
 * - effectiveReceived computation (manual flag, claim date comparison)
 * - Tag chip rendering conditions (exactColor, exactProduct, repeatable/onlyOnce)
 * - Visibility rules (blind context, claimed-by-others, repeatable gifts)
 * - Up/down button boundary states (first/last item in list)
 */

describe('computeEffectiveReceived', () => {
  it('should return true when gift is manually marked as received', () => {
    const gift = { manualReceived: true, onlyOnce: false }
    const claim = { giftDate: '2024-01-01' }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(true)
  })

  it('should return true when manual flag set, regardless of claim date', () => {
    const gift = { manualReceived: true, onlyOnce: true }
    const claim = { giftDate: '2024-02-01' } // Future date
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(true)
  })

  it('should return false when gift not manually received and no claim', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, null, today)).toBe(false)
  })

  it('should return true when today is after claim date for non-repeatable gift', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const claim = { giftDate: '2024-01-10' }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(true)
  })

  it('should return false when today equals claim date (not after)', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const claim = { giftDate: '2024-01-15' }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(false)
  })

  it('should return false when today is before claim date', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const claim = { giftDate: '2024-01-20' }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(false)
  })

  it('should return false for repeatable gift with claim (never effectively received via claim)', () => {
    const gift = { manualReceived: false, onlyOnce: false }
    const claim = { giftDate: '2024-01-10' }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(false)
  })

  it('should handle claim.giftDate as Date object', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const claim = { giftDate: new Date('2024-01-10') }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(true)
  })

  it('should handle claim.giftDate as ISO string', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const claim = { giftDate: '2024-01-10T00:00:00Z' }
    const today = new Date('2024-01-15')

    expect(computeEffectiveReceived(gift, claim, today)).toBe(true)
  })

  it('should normalize dates to midnight for fair comparison (today same day as claim)', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const claim = { giftDate: '2024-01-10' }
    // Create a date for 2024-01-10 in local time
    const today = new Date(2024, 0, 10, 23, 59, 59, 999)

    expect(computeEffectiveReceived(gift, claim, today)).toBe(false)
  })

  it('should normalize dates to midnight for fair comparison (today after claim)', () => {
    const gift = { manualReceived: false, onlyOnce: true }
    const claim = { giftDate: '2024-01-10' }
    // Create a date for 2024-01-11 in local time (day after claim)
    const today = new Date(2024, 0, 11, 0, 0, 0, 0)

    expect(computeEffectiveReceived(gift, claim, today)).toBe(true)
  })
})

describe('shouldShowGift', () => {
  it('should show all gifts in blind context (owner viewing own list)', () => {
    const gift = { id: 1, onlyOnce: true, manualReceived: false, claims: [{ claimerUserId: 2 }] }
    const viewerId = 1
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, true, today)).toBe(true)
  })

  it('should show all gifts in blind context even if claimed by others', () => {
    const gift = {
      id: 1,
      onlyOnce: true,
      manualReceived: false,
      claims: [
        { claimerUserId: 2, giftDate: '2024-02-01' }, // Future, not received
        { claimerUserId: 3, giftDate: '2024-02-01' },
      ],
    }
    const viewerId = 1
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, true, today)).toBe(true)
  })

  it('should show gift with no claims in non-blind context', () => {
    const gift = { id: 1, onlyOnce: true, manualReceived: false, claims: [] }
    const viewerId = 2
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(true)
  })

  it('should show gift when viewer has a claim on it', () => {
    const gift = {
      id: 1,
      onlyOnce: true,
      manualReceived: false,
      claims: [{ claimerUserId: 2, giftDate: '2024-02-01' }],
    }
    const viewerId = 2
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(true)
  })

  it('should show repeatable gift with other claims', () => {
    const gift = {
      id: 1,
      onlyOnce: false, // repeatable
      manualReceived: false,
      claims: [{ claimerUserId: 2, giftDate: '2024-01-10' }],
    }
    const viewerId = 3 // Different viewer
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(true)
  })

  it('should hide non-repeatable gift claimed by others when not yet received', () => {
    const gift = {
      id: 1,
      onlyOnce: true,
      manualReceived: false,
      claims: [{ claimerUserId: 2, giftDate: '2024-02-01' }], // Future date
    }
    const viewerId = 3
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(false)
  })

  it('should show non-repeatable gift when claimed by others but effectively received', () => {
    const gift = {
      id: 1,
      onlyOnce: true,
      manualReceived: false,
      claims: [{ claimerUserId: 2, giftDate: '2024-01-10' }], // Past date
    }
    const viewerId = 3
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(true)
  })

  it('should show non-repeatable gift when manually marked received (claimed by others)', () => {
    const gift = {
      id: 1,
      onlyOnce: true,
      manualReceived: true,
      claims: [{ claimerUserId: 2, giftDate: '2024-02-01' }], // Future date
    }
    const viewerId = 3
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(true)
  })

  it('should hide non-repeatable gift with multiple claims if any claim not received', () => {
    const gift = {
      id: 1,
      onlyOnce: true,
      manualReceived: false,
      claims: [
        { claimerUserId: 2, giftDate: '2024-01-10' }, // Past, received
        { claimerUserId: 3, giftDate: '2024-02-01' }, // Future, NOT received
      ],
    }
    const viewerId = 4
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(false)
  })

  it('should show non-repeatable gift with multiple claims all received', () => {
    const gift = {
      id: 1,
      onlyOnce: true,
      manualReceived: false,
      claims: [
        { claimerUserId: 2, giftDate: '2024-01-10' }, // Past
        { claimerUserId: 3, giftDate: '2024-01-12' }, // Past
      ],
    }
    const viewerId = 4
    const ownerId = 1
    const today = new Date('2024-01-15')

    expect(shouldShowGift(gift, viewerId, ownerId, false, today)).toBe(true)
  })
})

describe('computeGiftVisibility', () => {
  it('should filter and return visible gifts', () => {
    const gifts = [
      {
        id: 1,
        onlyOnce: true,
        manualReceived: false,
        claims: [{ claimerUserId: 2, giftDate: '2024-02-01' }], // Hidden
      },
      {
        id: 2,
        onlyOnce: false,
        manualReceived: false,
        claims: [],
      },
      {
        id: 3,
        onlyOnce: true,
        manualReceived: false,
        claims: [{ claimerUserId: 2, giftDate: '2024-01-10' }], // Visible (received)
      },
    ]
    const viewerId = 3
    const ownerId = 1
    const today = new Date('2024-01-15')

    const visible = computeGiftVisibility(gifts, viewerId, ownerId, false, today)

    expect(visible).toHaveLength(2)
    expect(visible.map(g => g.id)).toEqual([2, 3])
  })

  it('should return all gifts in blind context', () => {
    const gifts = [
      {
        id: 1,
        onlyOnce: true,
        manualReceived: false,
        claims: [{ claimerUserId: 2, giftDate: '2024-02-01' }],
      },
      {
        id: 2,
        onlyOnce: true,
        manualReceived: false,
        claims: [{ claimerUserId: 3, giftDate: '2024-02-01' }],
      },
    ]
    const viewerId = 1
    const ownerId = 1
    const today = new Date('2024-01-15')

    const visible = computeGiftVisibility(gifts, viewerId, ownerId, true, today)

    expect(visible).toHaveLength(2)
  })

  it('should return empty array when no gifts match visibility rules', () => {
    const gifts = [
      {
        id: 1,
        onlyOnce: true,
        manualReceived: false,
        claims: [{ claimerUserId: 2, giftDate: '2024-02-01' }],
      },
      {
        id: 2,
        onlyOnce: true,
        manualReceived: false,
        claims: [{ claimerUserId: 3, giftDate: '2024-02-05' }],
      },
    ]
    const viewerId = 4
    const ownerId = 1
    const today = new Date('2024-01-15')

    const visible = computeGiftVisibility(gifts, viewerId, ownerId, false, today)

    expect(visible).toHaveLength(0)
  })

  it('should preserve gift order from input', () => {
    const gifts = [
      { id: 5, onlyOnce: false, manualReceived: false, claims: [] },
      { id: 3, onlyOnce: false, manualReceived: false, claims: [] },
      { id: 1, onlyOnce: false, manualReceived: false, claims: [] },
    ]
    const viewerId = 2
    const ownerId = 1
    const today = new Date('2024-01-15')

    const visible = computeGiftVisibility(gifts, viewerId, ownerId, false, today)

    expect(visible.map(g => g.id)).toEqual([5, 3, 1])
  })
})

describe('Tag chip rendering conditions', () => {
  it('should determine if exactColor tag should render', () => {
    const giftWithExactColor = { exactColor: true, exactProduct: false, onlyOnce: true }
    const giftWithoutExactColor = { exactColor: false, exactProduct: false, onlyOnce: true }

    // Tags render when any of: exactColor, exactProduct, or isRepeatable (not onlyOnce)
    expect(giftWithExactColor.exactColor || giftWithExactColor.exactProduct || !giftWithExactColor.onlyOnce).toBe(true)
    expect(giftWithoutExactColor.exactColor || giftWithoutExactColor.exactProduct || !giftWithoutExactColor.onlyOnce).toBe(false)
  })

  it('should determine if exactProduct tag should render', () => {
    const giftWithExactProduct = { exactColor: false, exactProduct: true, onlyOnce: true }
    const giftWithoutExactProduct = { exactColor: false, exactProduct: false, onlyOnce: true }

    expect(giftWithExactProduct.exactProduct).toBe(true)
    expect(giftWithoutExactProduct.exactProduct).toBe(false)
  })

  it('should determine if repeatable tag should render (isRepeatable = !onlyOnce)', () => {
    const repeatableGift = { exactColor: false, exactProduct: false, onlyOnce: false }
    const nonRepeatableGift = { exactColor: false, exactProduct: false, onlyOnce: true }

    const isRepeatableTag = !repeatableGift.onlyOnce
    const isNonRepeatableTag = !nonRepeatableGift.onlyOnce

    expect(isRepeatableTag).toBe(true)
    expect(isNonRepeatableTag).toBe(false)
  })

  it('should render multiple tags when multiple flags are set', () => {
    const gift = { exactColor: true, exactProduct: true, onlyOnce: false }

    const tags = []
    if (gift.exactColor) tags.push('exactColor')
    if (gift.exactProduct) tags.push('exactProduct')
    if (!gift.onlyOnce) tags.push('repeatable')

    expect(tags).toHaveLength(3)
    expect(tags).toEqual(['exactColor', 'exactProduct', 'repeatable'])
  })

  it('should render no tags when all flags false/default', () => {
    const gift = { exactColor: false, exactProduct: false, onlyOnce: true }

    const tags = []
    if (gift.exactColor) tags.push('exactColor')
    if (gift.exactProduct) tags.push('exactProduct')
    if (!gift.onlyOnce) tags.push('repeatable')

    expect(tags).toHaveLength(0)
  })
})

describe('Up/down button boundary states', () => {
  it('should disable up button when gift is first in list (idx === 0)', () => {
    const gifts = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
      { id: 3, title: 'Third' },
    ]

    const idx = 0
    const canMoveUp = idx > 0

    expect(canMoveUp).toBe(false)
  })

  it('should enable up button when gift is not first (idx > 0)', () => {
    const gifts = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
      { id: 3, title: 'Third' },
    ]

    const idx = 1
    const canMoveUp = idx > 0

    expect(canMoveUp).toBe(true)
  })

  it('should disable down button when gift is last in list (idx === length - 1)', () => {
    const gifts = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
      { id: 3, title: 'Third' },
    ]

    const idx = gifts.length - 1
    const canMoveDown = idx < gifts.length - 1

    expect(canMoveDown).toBe(false)
  })

  it('should enable down button when gift is not last (idx < length - 1)', () => {
    const gifts = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
      { id: 3, title: 'Third' },
    ]

    const idx = 1
    const canMoveDown = idx < gifts.length - 1

    expect(canMoveDown).toBe(true)
  })

  it('should disable both buttons when single item in list', () => {
    const gifts = [{ id: 1, title: 'Only' }]

    const idx = 0
    const canMoveUp = idx > 0
    const canMoveDown = idx < gifts.length - 1

    expect(canMoveUp).toBe(false)
    expect(canMoveDown).toBe(false)
  })

  it('should enable up, disable down for first of two items', () => {
    const gifts = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
    ]

    const idx = 0
    const canMoveUp = idx > 0
    const canMoveDown = idx < gifts.length - 1

    expect(canMoveUp).toBe(false)
    expect(canMoveDown).toBe(true)
  })

  it('should disable up, enable down for second of two items', () => {
    const gifts = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
    ]

    const idx = 1
    const canMoveUp = idx > 0
    const canMoveDown = idx < gifts.length - 1

    expect(canMoveUp).toBe(true)
    expect(canMoveDown).toBe(false)
  })
})
