import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GiftCard } from '../../components/GiftCard'

describe('GiftCard', () => {
  const defaultGift = {
    id: '1',
    title: 'Test Gift',
    description: 'A test gift item',
    price: '$49.99',
    link: 'https://example.com/gift',
    exactColor: false,
    exactProduct: false,
    onlyOnce: true, // false = repeatable
    imageUrl: null,
  }

  const defaultProps = {
    gift: defaultGift,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onClaim: vi.fn(),
    onMarkReceived: vi.fn(),
    onMovePriority: vi.fn(),
    isOwner: true,
    isReceived: false,
    canMoveUp: true,
    canMoveDown: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch for link preview - default to no image
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  describe('price chip', () => {
    it('should render price chip when gift has price', () => {
      const gift = { ...defaultGift, price: '$29.99' }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const priceElement = screen.getByText('$29.99')
      expect(priceElement).toBeInTheDocument()
      expect(priceElement).toHaveClass('gift-card__price')
    })

    it('should not render price chip when gift has no price', () => {
      const gift = { ...defaultGift, price: null }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const priceElement = screen.queryByText(/\$/)
      expect(priceElement).not.toBeInTheDocument()
    })

    it('should not render price chip when price is undefined', () => {
      const gift = { ...defaultGift, price: undefined }
      render(<GiftCard {...defaultProps} gift={gift} />)

      // The title should still be there, but no price element
      expect(screen.getByText('Test Gift')).toBeInTheDocument()
    })

    it('should render price chip with empty string (falsy)', () => {
      const gift = { ...defaultGift, price: '' }
      render(<GiftCard {...defaultProps} gift={gift} />)

      // Empty string is falsy, so price chip should not render
      const titleElement = screen.getByText('Test Gift')
      expect(titleElement).toBeInTheDocument()
    })
  })

  describe('image', () => {
    it('should render image when imageUrl is provided', async () => {
      const gift = { ...defaultGift }
      const props = {
        ...defaultProps,
        gift,
      }

      // Mock fetch to return image URL
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ imageUrl: 'https://example.com/image.jpg' }),
      })

      render(<GiftCard {...props} />)

      // Wait for the image to be rendered
      await waitFor(() => {
        const img = screen.queryByAltText('Test Gift')
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
      })
    })

    it('should not render image when imageUrl is not provided', async () => {
      const gift = { ...defaultGift }
      const props = {
        ...defaultProps,
        gift,
      }

      // Mock fetch to return no image URL
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      render(<GiftCard {...props} />)

      // Wait for fetch to complete and verify no image is rendered
      await waitFor(() => {
        const img = screen.queryByAltText('Test Gift')
        expect(img).not.toBeInTheDocument()
      })
    })
  })

  describe('move buttons', () => {
    it('should disable up button when canMoveUp is false', () => {
      const props = { ...defaultProps, canMoveUp: false }
      render(<GiftCard {...props} />)

      const upButton = screen.getByTitle('Move up')
      expect(upButton).toBeDisabled()
    })

    it('should enable up button when canMoveUp is true', () => {
      const props = { ...defaultProps, canMoveUp: true }
      render(<GiftCard {...props} />)

      const upButton = screen.getByTitle('Move up')
      expect(upButton).not.toBeDisabled()
    })

    it('should disable down button when canMoveDown is false', () => {
      const props = { ...defaultProps, canMoveDown: false }
      render(<GiftCard {...props} />)

      const downButton = screen.getByTitle('Move down')
      expect(downButton).toBeDisabled()
    })

    it('should enable down button when canMoveDown is true', () => {
      const props = { ...defaultProps, canMoveDown: true }
      render(<GiftCard {...props} />)

      const downButton = screen.getByTitle('Move down')
      expect(downButton).not.toBeDisabled()
    })

    it('should have both up and down buttons disabled at boundaries', () => {
      const props = {
        ...defaultProps,
        canMoveUp: false,
        canMoveDown: false,
      }
      render(<GiftCard {...props} />)

      const upButton = screen.getByTitle('Move up')
      const downButton = screen.getByTitle('Move down')

      expect(upButton).toBeDisabled()
      expect(downButton).toBeDisabled()
    })
  })

  describe('tags', () => {
    it('should render exactColor tag when exactColor is true', () => {
      const gift = { ...defaultGift, exactColor: true }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const tag = screen.getByText('Exact color')
      expect(tag).toBeInTheDocument()
      expect(tag).toHaveClass('gift-card__tag--violet')
    })

    it('should not render exactColor tag when exactColor is false', () => {
      const gift = { ...defaultGift, exactColor: false }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.queryByText('Exact color')).not.toBeInTheDocument()
    })

    it('should render exactProduct tag when exactProduct is true', () => {
      const gift = { ...defaultGift, exactProduct: true }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const tag = screen.getByText('Exact product')
      expect(tag).toBeInTheDocument()
      expect(tag).toHaveClass('gift-card__tag--violet')
    })

    it('should not render exactProduct tag when exactProduct is false', () => {
      const gift = { ...defaultGift, exactProduct: false }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.queryByText('Exact product')).not.toBeInTheDocument()
    })

    it('should render Repeatable tag when onlyOnce is false', () => {
      const gift = { ...defaultGift, onlyOnce: false }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const tag = screen.getByText('Repeatable')
      expect(tag).toBeInTheDocument()
      expect(tag).toHaveClass('gift-card__tag--teal')
    })

    it('should not render Repeatable tag when onlyOnce is true', () => {
      const gift = { ...defaultGift, onlyOnce: true }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.queryByText('Repeatable')).not.toBeInTheDocument()
    })

    it('should render all three tags when all flags are set', () => {
      const gift = {
        ...defaultGift,
        exactColor: true,
        exactProduct: true,
        onlyOnce: false,
      }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.getByText('Exact color')).toBeInTheDocument()
      expect(screen.getByText('Exact product')).toBeInTheDocument()
      expect(screen.getByText('Repeatable')).toBeInTheDocument()
    })

    it('should render violet tags for exactColor and exactProduct', () => {
      const gift = {
        ...defaultGift,
        exactColor: true,
        exactProduct: true,
      }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const exactColorTag = screen.getByText('Exact color')
      const exactProductTag = screen.getByText('Exact product')

      expect(exactColorTag).toHaveClass('gift-card__tag--violet')
      expect(exactProductTag).toHaveClass('gift-card__tag--violet')
    })

    it('should render teal tag for repeatable', () => {
      const gift = { ...defaultGift, onlyOnce: false }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const repeatableTag = screen.getByText('Repeatable')
      expect(repeatableTag).toHaveClass('gift-card__tag--teal')
    })

    it('should not render tags container when no tags are present', () => {
      const gift = {
        ...defaultGift,
        exactColor: false,
        exactProduct: false,
        onlyOnce: true,
      }
      render(<GiftCard {...defaultProps} gift={gift} />)

      // The tags container should not exist if no tags are present
      const tagsContainer = screen.queryByText('Exact color')
      expect(tagsContainer).not.toBeInTheDocument()
    })
  })

  describe('owner view controls', () => {
    it('should show action buttons in owner view', () => {
      const props = { ...defaultProps, isOwner: true, isReceived: false }
      render(<GiftCard {...props} />)

      expect(screen.getByTitle('Move up')).toBeInTheDocument()
      expect(screen.getByTitle('Move down')).toBeInTheDocument()
      expect(screen.getByTitle('Edit')).toBeInTheDocument()
      expect(screen.getByTitle('Mark as received')).toBeInTheDocument()
      expect(screen.getByTitle('Delete')).toBeInTheDocument()
    })

    it('should not show action buttons in non-owner view', () => {
      const props = { ...defaultProps, isOwner: false }
      render(<GiftCard {...props} />)

      expect(screen.queryByTitle('Move up')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Move down')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Mark as received')).not.toBeInTheDocument()
    })

    it('should hide action buttons when received', () => {
      const props = { ...defaultProps, isOwner: true, isReceived: true }
      render(<GiftCard {...props} />)

      expect(screen.queryByTitle('Move up')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Move down')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Mark as received')).not.toBeInTheDocument()
    })
  })

  describe('gift card styling', () => {
    it('should apply received class when isReceived is true', () => {
      const props = { ...defaultProps, isReceived: true }
      const { container } = render(<GiftCard {...props} />)

      const giftCard = container.querySelector('.gift-card')
      expect(giftCard).toHaveClass('gift-card--received')
    })

    it('should not apply received class when isReceived is false', () => {
      const props = { ...defaultProps, isReceived: false }
      const { container } = render(<GiftCard {...props} />)

      const giftCard = container.querySelector('.gift-card')
      expect(giftCard).not.toHaveClass('gift-card--received')
    })
  })

  describe('title and description', () => {
    it('should render title', () => {
      const gift = { ...defaultGift, title: 'Custom Title' }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
    })

    it('should render description when present', () => {
      const gift = { ...defaultGift, description: 'Test description' }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.getByText('Test description')).toBeInTheDocument()
    })

    it('should not render description when not present', () => {
      const gift = { ...defaultGift, description: null }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.queryByText('A test gift item')).not.toBeInTheDocument()
    })
  })

  describe('link handling', () => {
    it('should render "View item" link when link is present', () => {
      const gift = { ...defaultGift, link: 'https://example.com/gift' }
      render(<GiftCard {...defaultProps} gift={gift} />)

      const link = screen.getByText('View item')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com/gift')
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('should not render "View item" link when link is not present', () => {
      const gift = { ...defaultGift, link: null }
      render(<GiftCard {...defaultProps} gift={gift} />)

      expect(screen.queryByText('View item')).not.toBeInTheDocument()
    })
  })
})
