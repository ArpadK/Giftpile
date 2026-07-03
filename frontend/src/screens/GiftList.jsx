import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TopBar } from '../components/TopBar'
import { GiftCard } from '../components/GiftCard'
import { ClaimModal } from '../components/ClaimModal'
import { GiftFormModal } from '../components/GiftFormModal'
import { GiftDeleteConfirmModal } from '../components/GiftDeleteConfirmModal'
import './GiftList.css'

/**
 * GiftList screen — displays gifts for owner, viewer, and admin-edit modes.
 *
 * Owner view: Full CRUD controls (add, edit, delete, mark received, undo, move up/down)
 * Viewer view: Claim controls ("I'll get this one", edit/unclaim for own claims)
 * Admin-edit view: Owner controls with amber banner warning
 */
export function GiftList() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()

  const [gifts, setGifts] = useState([])
  const [showReceivedGifts, setShowReceivedGifts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [editingGift, setEditingGift] = useState(null)
  const [claimingGift, setClaimingGift] = useState(null)
  const [claimEditMode, setClaimEditMode] = useState(false)
  const [ownerName, setOwnerName] = useState(null)

  const targetUserId = userId ? parseInt(userId) : currentUser?.id
  const isOwner = targetUserId === currentUser?.id
  const isAdminEdit = location.pathname.startsWith('/admin/list/')

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }
    loadGifts()
  }, [userId, currentUser, navigate])

  async function loadGifts() {
    try {
      const res = await fetch(`/api/users/${targetUserId}/gifts`, {
        credentials: 'include',
      })
      if (!res.ok) {
        if (res.status === 401) navigate('/')
        throw new Error('Failed to load gifts')
      }
      const data = await res.json()
      setGifts(data || [])
    } catch (err) {
      console.error('Failed to load gifts:', err)
    } finally {
      setLoading(false)
    }
  }

  // Resolve the list owner's name for the header (when viewing someone else's list).
  useEffect(() => {
    if (isOwner || !targetUserId) return
    async function loadOwner() {
      try {
        const res = await fetch(`/api/users`, { credentials: 'include' })
        if (res.ok) {
          const users = await res.json()
          const owner = users.find(u => u.id === targetUserId)
          if (owner) setOwnerName(owner.name)
        }
      } catch (err) {
        console.error('Failed to fetch owner:', err)
      }
    }
    loadOwner()
  }, [isOwner, targetUserId])

  const activeGifts = gifts.filter(g => !g.manualReceived && !g.effectiveReceived)
  const receivedGifts = gifts.filter(g => g.manualReceived || g.effectiveReceived)
  const hasReceivedGifts = receivedGifts.length > 0

  async function handleAddGift(formData) {
    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // Target the list being viewed so admins adding in admin-edit mode create the
          // gift on the correct user's list (not their own).
          ownerId: targetUserId,
          ...formData,
        }),
      })
      if (!res.ok) throw new Error('Failed to add gift')
      const newGift = await res.json()
      setGifts([newGift, ...activeGifts, ...receivedGifts])
      setShowAddModal(false)
    } catch (err) {
      console.error('Failed to add gift:', err)
    }
  }

  async function handleEditGift(giftId, formData) {
    try {
      const res = await fetch(`/api/gifts/${giftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to edit gift')
      const updated = await res.json()
      setGifts(gifts.map(g => (g.id === giftId ? updated : g)))
      setEditingGift(null)
    } catch (err) {
      console.error('Failed to edit gift:', err)
    }
  }

  async function handleDeleteGift(giftId) {
    try {
      const res = await fetch(`/api/gifts/${giftId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete gift')
      setGifts(gifts.filter(g => g.id !== giftId))
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete gift:', err)
    }
  }

  async function handleMarkReceived(giftId, received) {
    try {
      const res = await fetch(`/api/gifts/${giftId}/received`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ received }),
      })
      if (!res.ok) throw new Error('Failed to update gift')
      const updated = await res.json()
      setGifts(gifts.map(g => (g.id === giftId ? updated : g)))
    } catch (err) {
      console.error('Failed to mark gift:', err)
    }
  }

  async function handleMovePriority(giftId, direction) {
    try {
      const res = await fetch(`/api/gifts/${giftId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ direction }),
      })
      if (!res.ok) throw new Error('Failed to move gift')
      await loadGifts()
    } catch (err) {
      console.error('Failed to move gift:', err)
    }
  }

  async function handleClaimGift(giftDate) {
    if (!claimingGift) return
    try {
      if (claimEditMode && claimingGift.claim) {
        // Update existing claim
        const res = await fetch(`/api/gifts/${claimingGift.id}/claim`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ giftDate }),
        })
        if (!res.ok) throw new Error('Failed to update claim')
      } else {
        // Create new claim
        const res = await fetch(`/api/gifts/${claimingGift.id}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ giftDate }),
        })
        // 409 means someone else already claimed it — surface a clear message.
        if (res.status === 409) {
          alert('This gift was already claimed by someone else.')
        } else if (!res.ok) {
          throw new Error('Failed to claim gift')
        }
      }
      setClaimingGift(null)
      setClaimEditMode(false)
      await loadGifts()
    } catch (err) {
      console.error('Failed to claim gift:', err)
      alert('Failed to claim gift')
    }
  }

  async function handleUnclaimGift() {
    if (!claimingGift) return
    try {
      const res = await fetch(`/api/gifts/${claimingGift.id}/claim`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to unclaim gift')
      setClaimingGift(null)
      setClaimEditMode(false)
      await loadGifts()
    } catch (err) {
      console.error('Failed to unclaim gift:', err)
      alert('Failed to unclaim gift')
    }
  }

  const screenTitle = isOwner ? 'My gift list' : (ownerName || 'Gift list')
  const screenSubtitle = isOwner ? null : 'Their gift ideas'
  const backTo = isAdminEdit ? '/admin' : '/home'

  if (loading) {
    return (
      <div className="gift-list">
        <TopBar title={screenTitle} subtitle={screenSubtitle} showBack backTo={backTo} />
        <div className="gift-list__content">Loading...</div>
      </div>
    )
  }

  return (
    <div className="gift-list">
      {isAdminEdit && (
        <div className="admin-edit-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C4.5 2 2 4.5 2 8s2.5 6 6 6 6-2.5 6-6-2.5-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="currentColor"/>
          </svg>
          <span>Admin mode — you're editing someone else's list. You can't see who will receive which gift.</span>
        </div>
      )}
      <TopBar title={screenTitle} subtitle={screenSubtitle} showBack backTo={backTo} />

      <div className="gift-list__content">
        {/* Add button (owner or admin-edit) */}
        {(isOwner || isAdminEdit) && (
          <button className="gift-list__add-button" onClick={() => setShowAddModal(true)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2V16M2 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add a gift idea
          </button>
        )}

        {/* Active gifts section */}
        {activeGifts.length === 0 ? (
          <div className="gift-list__empty-state">
            <svg className="gift-list__empty-icon" viewBox="0 0 64 64" fill="none">
              <path d="M32 8C20 8 10 18 10 30V50C10 56 14 62 20 62H44C50 62 54 56 54 50V30C54 18 44 8 32 8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M22 28H42M22 38H42M22 48H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3 className="gift-list__empty-title">
              {isOwner ? 'No gift ideas yet' : 'No gift ideas'}
            </h3>
            <p className="gift-list__empty-text">
              {isOwner ? 'Add your first gift idea using the button above' : 'Check back soon'}
            </p>
          </div>
        ) : (
          <div className="gift-list__active-stack">
            {activeGifts.map((gift, idx) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                isOwner={isOwner || isAdminEdit}
                isReceived={false}
                canMoveUp={idx > 0}
                canMoveDown={idx < activeGifts.length - 1}
                viewerClaim={!isOwner && !isAdminEdit ? gift.claim : null}
                onEdit={() => (isOwner || isAdminEdit) && setEditingGift(gift)}
                onDelete={() => (isOwner || isAdminEdit) && setShowDeleteConfirm(gift)}
                onMarkReceived={() => (isOwner || isAdminEdit) && handleMarkReceived(gift.id, true)}
                onMovePriority={(dir) => (isOwner || isAdminEdit) && handleMovePriority(gift.id, dir)}
                onClaim={() => {
                  if (!isOwner && !isAdminEdit) {
                    setClaimingGift(gift)
                    setClaimEditMode(!!gift.claim)
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Received gifts section */}
        {hasReceivedGifts && (
          <div className="gift-list__received-section">
            <label className="gift-list__toggle-row">
              <input
                type="checkbox"
                className="gift-list__toggle-checkbox"
                checked={showReceivedGifts}
                onChange={(e) => setShowReceivedGifts(e.target.checked)}
              />
              <span className="gift-list__toggle-label">
                {showReceivedGifts ? 'Hide' : 'Show'} received gifts ({receivedGifts.length})
              </span>
            </label>

            {showReceivedGifts && (
              <div className="gift-list__received-stack">
                {receivedGifts.map((gift) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    isOwner={isOwner || isAdminEdit}
                    isReceived={true}
                    canMoveUp={false}
                    canMoveDown={false}
                    viewerClaim={!isOwner && !isAdminEdit ? gift.claim : null}
                    onMarkReceived={() => (isOwner || isAdminEdit) && handleMarkReceived(gift.id, false)}
                    onDelete={() => (isOwner || isAdminEdit) && setShowDeleteConfirm(gift)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Gift Modal (owner or admin-edit) */}
      {(isOwner || isAdminEdit) && (showAddModal || editingGift) && (
        <GiftFormModal
          gift={editingGift}
          onSave={editingGift ? (data) => handleEditGift(editingGift.id, data) : handleAddGift}
          onClose={() => {
            setShowAddModal(false)
            setEditingGift(null)
          }}
        />
      )}

      {/* Claim Modal (viewer only) */}
      {!isOwner && !isAdminEdit && claimingGift && (
        <ClaimModal
          gift={claimingGift}
          isEdit={claimEditMode}
          existingDate={claimingGift.claim?.giftDate}
          onClaim={handleClaimGift}
          onUnclaim={handleUnclaimGift}
          onClose={() => {
            setClaimingGift(null)
            setClaimEditMode(false)
          }}
        />
      )}

      {/* Delete Confirmation */}
      {(isOwner || isAdminEdit) && showDeleteConfirm && (
        <GiftDeleteConfirmModal
          gift={showDeleteConfirm}
          onConfirm={() => handleDeleteGift(showDeleteConfirm.id)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
