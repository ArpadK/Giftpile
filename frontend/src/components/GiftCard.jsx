import React, { useEffect, useState } from 'react'
import './GiftCard.css'

/**
 * GiftCard component (active state)
 *
 * Displays a gift with:
 * - Optional 140px cover image (fetched via link preview)
 * - Title + price chip
 * - Description and "View item" link
 * - Tag chips (exactColor: violet, exactProduct: violet, repeatable: teal)
 * - Action row (move-up, move-down, spacer, edit, mark-received, delete)
 *
 * Variants:
 * - Owner view: show edit/delete/move buttons
 * - Viewer view: show "I'll get this one" button (if unclaimed) or "You're giving this" green bar
 * - Received state: 60% opacity, show undo button instead of edit/delete
 */
export function GiftCard({
  gift,
  onEdit,
  onDelete,
  onClaim,
  onMarkReceived,
  onMovePriority,
  isOwner = true,
  isReceived = false,
  canMoveUp = true,
  canMoveDown = true,
  viewerClaim = null, // For other-member-list: current viewer's claim on this gift, if any
}) {
  const [imageUrl, setImageUrl] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)

  useEffect(() => {
    if (gift.link) {
      fetchPreview()
    }
  }, [gift.link])

  async function fetchPreview() {
    try {
      setImageLoading(true)
      const encoded = encodeURIComponent(gift.link)
      const response = await fetch(`/api/link-preview?url=${encoded}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.imageUrl) {
          setImageUrl(data.imageUrl)
        }
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err)
    } finally {
      setImageLoading(false)
    }
  }

  const isRepeatable = !gift.onlyOnce

  return (
    <div className={`gift-card ${isReceived ? 'gift-card--received' : ''}`}>
      {imageUrl && (
        <div className="gift-card__image-container">
          <img src={imageUrl} alt={gift.title} className="gift-card__cover" />
        </div>
      )}

      <div className="gift-card__content">
        <div className="gift-card__header">
          <div className="gift-card__title-section">
            <div className={`gift-card__title ${viewerClaim ? 'gift-card__title--claimed' : ''}`}>
              {gift.title}
            </div>
            {gift.price && (
              <div className="gift-card__price">{gift.price}</div>
            )}
          </div>
        </div>

        {gift.description && (
          <p className="gift-card__description">{gift.description}</p>
        )}

        {gift.link && (
          <a href={gift.link} target="_blank" rel="noopener noreferrer" className="gift-card__link">
            View item
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 12L12 2M12 2H5M12 2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}

        {(gift.exactColor || gift.exactProduct || isRepeatable) && (
          <div className="gift-card__tags">
            {gift.exactColor && (
              <span className="gift-card__tag gift-card__tag--violet">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="6" r="4" />
                </svg>
                Exact color
              </span>
            )}
            {gift.exactProduct && (
              <span className="gift-card__tag gift-card__tag--violet">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="2" width="8" height="8" />
                </svg>
                Exact product
              </span>
            )}
            {isRepeatable && (
              <span className="gift-card__tag gift-card__tag--teal">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
                </svg>
                Repeatable
              </span>
            )}
          </div>
        )}

        {/* Owner view: edit/delete/move controls */}
        {isOwner && !isReceived && (
          <div className="gift-card__actions">
            <button
              className="gift-card__action-btn"
              onClick={() => onMovePriority?.('up')}
              disabled={!canMoveUp}
              title="Move up"
              aria-label="Move up"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 12.5V3.5M4.5 7L8 3.5L11.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className="gift-card__action-btn"
              onClick={() => onMovePriority?.('down')}
              disabled={!canMoveDown}
              title="Move down"
              aria-label="Move down"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.5V12.5M4.5 9L8 12.5L11.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="gift-card__spacer" />

            <button
              className="gift-card__action-btn"
              onClick={onEdit}
              title="Edit"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11.3 2.7L13.3 4.7M2 14h2l9-9-2-2-9 9v2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className="gift-card__action-btn gift-card__action-btn--mark-received"
              onClick={() => onMarkReceived?.(true)}
              title="Mark as received"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.3 4.3L6 11.6 2.7 8.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className="gift-card__action-btn gift-card__action-btn--delete"
              onClick={onDelete}
              title="Delete"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M6.5 7v5M9.5 7v5M3.5 4l.5 9.5c0 .8.7 1.5 1.5 1.5h5c.8 0 1.5-.7 1.5-1.5L12.5 4M6 4V2.5c0-.3.2-.5.5-.5h3c.3 0 .5.2.5.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Received state: show undo button */}
        {isOwner && isReceived && (
          <div className="gift-card__actions">
            <button className="gift-card__undo-btn" onClick={() => onMarkReceived?.(false)}>
              Undo
            </button>
            <div className="gift-card__spacer" />
            <button className="gift-card__delete-btn" onClick={onDelete} title="Delete">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M6.5 7v5M9.5 7v5M3.5 4l.5 9.5c0 .8.7 1.5 1.5 1.5h5c.8 0 1.5-.7 1.5-1.5L12.5 4M6 4V2.5c0-.3.2-.5.5-.5h3c.3 0 .5.2.5.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Viewer view: unclaimed gift - show "I'll get this one" button */}
        {!isOwner && !viewerClaim && !isReceived && (
          <button className="gift-card__claim-btn" onClick={() => onClaim?.()}>
            I'll get this one
          </button>
        )}

        {/* Viewer view: viewer's own claim - show green bar + edit button */}
        {!isOwner && viewerClaim && !isReceived && (
          <>
            <div className="gift-card__claim-bar">
              <div className="gift-card__claim-bar-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M11.7 3.3L5.5 9.5 2.3 6.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <span>You're giving this ({viewerClaim.giftDate})</span>
            </div>
            <button className="gift-card__claim-btn" onClick={onClaim}>
              Edit date
            </button>
          </>
        )}
      </div>
    </div>
  )
}
