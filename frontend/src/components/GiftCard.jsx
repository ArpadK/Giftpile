import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import './GiftCard.css'

/** Display a price with a leading euro sign, tolerating legacy values that already have a symbol. */
function formatPrice(price) {
  if (price == null || String(price).trim() === '') return ''
  const amount = String(price).trim().replace(/^[€$£]\s*/, '')
  return `€${amount}`
}

// Abstract gradient covers used when a gift has no fetched preview image. Keyed by gift id so
// each gift consistently gets one and neighbours differ, keeping the list from looking sterile.
const COVER_PALETTES = [
  ['#4C5FE8', '#8B5CF6'],
  ['#2EC4B6', '#4C5FE8'],
  ['#F2A93B', '#FF6B6B'],
  ['#FF8FB1', '#8B5CF6'],
  ['#22C55E', '#2EC4B6'],
  ['#FF6B6B', '#F2A93B'],
]

const COVER_SHAPES = [
  [[60, 40, 70], [320, 120, 90], [210, 20, 40]],
  [[340, 30, 80], [40, 120, 60], [180, 95, 50]],
  [[200, 70, 95], [55, 110, 45], [350, 45, 55]],
  [[100, 15, 55], [300, 105, 85], [225, 135, 40]],
  [[30, 60, 75], [380, 80, 90], [205, 10, 30]],
  [[360, 120, 75], [80, 25, 60], [245, 90, 45]],
]

function PlaceholderCover({ seed = 0 }) {
  const i = Math.abs(seed) % COVER_PALETTES.length
  const [c1, c2] = COVER_PALETTES[i]
  const gid = `giftcover-${seed}-${i}`
  return (
    <svg className="gift-card__cover" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill={`url(#${gid})`} />
      <g fill="#ffffff">
        {COVER_SHAPES[i].map(([cx, cy, r], idx) => (
          <circle key={idx} cx={cx} cy={cy} r={r} opacity={0.10 + idx * 0.04} />
        ))}
      </g>
    </svg>
  )
}

/**
 * GiftCard component.
 *
 * Variants:
 * - Owner/admin active: edit/delete/move + mark-received controls
 * - Viewer active: "I'll get this one" button, or a green "You're giving this" bar for own claim
 * - Received: compact dimmed row with undo/delete (owner) or "You gave this — edit" (viewer)
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
  viewerClaim = null, // For other-member list: current viewer's claim on this gift, if any
}) {
  const [imageUrl, setImageUrl] = useState(null)

  useEffect(() => {
    // Reset the preview whenever the link changes so a stale image never lingers when the new
    // link has no fetchable image. `active` guards against an out-of-order in-flight response.
    let active = true
    setImageUrl(null)

    if (gift.link) {
      api.get(`/api/link-preview?url=${encodeURIComponent(gift.link)}`)
        .then((data) => {
          if (active && data?.imageUrl) setImageUrl(data.imageUrl)
        })
        .catch(() => {}) // Previews are best-effort; the placeholder cover stays.
    }

    return () => { active = false }
  }, [gift.link])

  // Compact received row (dimmed).
  if (isReceived) {
    return (
      <div className="gift-card gift-card--received">
        <div className="gift-card__received-main">
          <div className="gift-card__received-title">{gift.title}</div>
          <div className="gift-card__received-label">
            {isOwner ? 'Marked as received' : 'Received'}
          </div>
        </div>
        <div className="gift-card__received-actions">
          {isOwner && (
            <>
              <button className="gift-card__undo-btn" onClick={() => onMarkReceived?.(false)}>Undo</button>
              <button className="gift-card__delete-btn gift-card__delete-btn--sm" onClick={onDelete} aria-label="Delete" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </>
          )}
          {!isOwner && viewerClaim && (
            <button className="gift-card__edit-pill" onClick={onClaim}>You gave this — edit</button>
          )}
        </div>
      </div>
    )
  }

  const isRepeatable = !gift.onlyOnce
  const isExperience = gift.type === 'EXPERIENCE'
  const hasTags = true // type tag is always shown

  return (
    <div className={`gift-card${viewerClaim ? ' gift-card--claimed-by-me' : ''}`}>
      <div className="gift-card__image-container">
        {imageUrl
          ? <img src={imageUrl} alt={gift.title} className="gift-card__cover" />
          : <PlaceholderCover seed={gift.id} />}
      </div>

      <div className="gift-card__content">
        <div className="gift-card__header">
          <div className={`gift-card__title${viewerClaim ? ' gift-card__title--claimed' : ''}`}>
            {gift.title}
          </div>
          {gift.price && <div className="gift-card__price">{formatPrice(gift.price)}</div>}
        </div>

        {gift.description && (
          <p className="gift-card__description">{gift.description}</p>
        )}

        {gift.link && (
          <a href={gift.link} target="_blank" rel="noopener noreferrer" className="gift-card__link">
            View item
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        )}

        {hasTags && (
          <div className="gift-card__tags">
            <span className={`gift-card__tag gift-card__tag--${isExperience ? 'amber' : 'blue'}`}>
              {isExperience ? '✨ Experience' : '🎁 Gift'}
            </span>
            {gift.exactColor && <span className="gift-card__tag gift-card__tag--violet">Exact color</span>}
            {gift.exactProduct && <span className="gift-card__tag gift-card__tag--violet">Exact product</span>}
            {isRepeatable && <span className="gift-card__tag gift-card__tag--teal">Can give more than once</span>}
          </div>
        )}

        {/* Owner / admin-edit: action row */}
        {isOwner && (
          <div className="gift-card__actions">
            <button
              className="gift-card__move-btn"
              onClick={() => onMovePriority?.('up')}
              disabled={!canMoveUp}
              aria-label="Move up"
              title="Move up"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button
              className="gift-card__move-btn"
              onClick={() => onMovePriority?.('down')}
              disabled={!canMoveDown}
              aria-label="Move down"
              title="Move down"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div className="gift-card__spacer" />

            <button className="gift-card__icon-btn gift-card__icon-btn--edit" onClick={onEdit} aria-label="Edit" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button className="gift-card__icon-btn gift-card__icon-btn--received" onClick={() => onMarkReceived?.(true)} aria-label="Mark as received" title="Mark as received">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
            <button className="gift-card__icon-btn gift-card__icon-btn--delete" onClick={onDelete} aria-label="Delete" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Viewer: own claim bar */}
        {!isOwner && viewerClaim && (
          <div className="gift-card__claim-bar">
            <span className="gift-card__claim-bar-text">You're giving this · {viewerClaim.giftDate}</span>
            <button className="gift-card__edit-pill gift-card__edit-pill--on-green" onClick={onClaim}>Edit</button>
          </div>
        )}

        {/* Viewer: unclaimed */}
        {!isOwner && !viewerClaim && (
          <button className="gift-card__claim-btn" onClick={() => onClaim?.()}>
            I'll get this one
          </button>
        )}
      </div>
    </div>
  )
}
