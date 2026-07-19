import React, { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TopBar } from '../components/TopBar'
import { GiftCard } from '../components/GiftCard'
import { ClaimModal } from '../components/ClaimModal'
import { GiftFormModal } from '../components/GiftFormModal'
import { GiftDeleteConfirmModal } from '../components/GiftDeleteConfirmModal'
import { FilterSheet } from '../components/FilterSheet'
import { api } from '../lib/api'
import './GiftList.css'

/**
 * GiftList screen — one component for three contexts:
 * - Owner view (/list/me): full CRUD (add, edit, delete, mark received, reorder)
 * - Viewer view (/list/:userId): claim controls, reveal rules applied by the backend
 * - Admin-edit view (/admin/list/:userId): owner controls on someone else's list, with a banner
 */
export function GiftList() {
  const { userId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [gifts, setGifts] = useState([])
  const [ownerName, setOwnerName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReceivedGifts, setShowReceivedGifts] = useState(false)

  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGift, setEditingGift] = useState(null)
  const [deletingGift, setDeletingGift] = useState(null)
  const [claimingGift, setClaimingGift] = useState(null)
  const [claimEditMode, setClaimEditMode] = useState(false)

  const [canManage, setCanManage] = useState(false)

  const targetUserId = userId ? Number(userId) : currentUser.id
  const isOwner = targetUserId === currentUser.id
  const isAdminEdit = location.pathname.startsWith('/admin/list/')
  const isManageEdit = location.pathname.startsWith('/manage/list/')
  // Guardian edit mode is gated on the server-confirmed manage capability, not just the URL, so a
  // non-manager who navigates straight to /manage/list/:id gets the ordinary (reveal) view.
  const canEdit = isOwner || isAdminEdit || (isManageEdit && canManage)

  useEffect(() => {
    loadGifts()
  }, [targetUserId, isAdminEdit])

  // Resolve the list owner's name + whether the current user manages this list (guardian).
  useEffect(() => {
    if (isOwner) {
      setCanManage(false)
      return
    }
    api.get(`/api/users/${targetUserId}`)
      .then((meta) => {
        setOwnerName(meta.name)
        setCanManage(!!meta.canManage)
      })
      .catch((err) => console.error('Failed to fetch owner:', err))
  }, [isOwner, targetUserId])

  async function loadGifts() {
    try {
      // Admin-edit is a blind context (see every gift, no claim data) → use the admin endpoint.
      // The regular endpoint would treat the admin as an ordinary viewer and hide claimed/
      // received gifts, leaving them unable to edit the full list.
      const path = isAdminEdit
        ? `/api/admin/users/${targetUserId}/gifts`
        : `/api/users/${targetUserId}/gifts`
      const data = await api.get(path)
      setGifts(data || [])
    } catch (err) {
      console.error('Failed to load gifts:', err)
    } finally {
      setLoading(false)
    }
  }

  const activeGifts = gifts.filter(g => !g.manualReceived && !g.effectiveReceived)
  const receivedGifts = gifts.filter(g => g.manualReceived || g.effectiveReceived)

  const hasActiveFilter = priceMin !== '' || priceMax !== '' || typeFilter !== ''

  function parsePrice(price) {
    if (price == null) return null
    const num = parseFloat(String(price).replace(/[^0-9.]/g, ''))
    return isNaN(num) ? null : num
  }

  const filteredActiveGifts = hasActiveFilter ? activeGifts.filter(g => {
    if (typeFilter && g.type !== typeFilter) return false
    const p = parsePrice(g.price)
    if (p === null) return true
    if (priceMin !== '' && p < parseFloat(priceMin)) return false
    if (priceMax !== '' && p > parseFloat(priceMax)) return false
    return true
  }) : activeGifts

  function handleFilterApply({ priceMin: min, priceMax: max, typeFilter: type }) {
    setPriceMin(min)
    setPriceMax(max)
    setTypeFilter(type)
  }

  async function handleSaveGift(formData) {
    try {
      if (editingGift) {
        await api.put(`/api/gifts/${editingGift.id}`, formData)
      } else {
        await api.post('/api/gifts', { ownerId: targetUserId, ...formData })
      }
      setShowAddModal(false)
      setEditingGift(null)
      await loadGifts()
    } catch (err) {
      console.error('Failed to save gift:', err)
      alert(err.message)
    }
  }

  async function handleDeleteGift(giftId) {
    try {
      await api.delete(`/api/gifts/${giftId}`)
      setDeletingGift(null)
      await loadGifts()
    } catch (err) {
      console.error('Failed to delete gift:', err)
      alert(err.message)
    }
  }

  async function handleMarkReceived(giftId, received) {
    try {
      await api.patch(`/api/gifts/${giftId}/received`, { received })
      await loadGifts()
    } catch (err) {
      console.error('Failed to update gift:', err)
    }
  }

  async function handleMovePriority(giftId, direction) {
    try {
      await api.patch(`/api/gifts/${giftId}/priority`, { direction })
      await loadGifts()
    } catch (err) {
      console.error('Failed to move gift:', err)
    }
  }

  async function handleClaimGift(giftDate) {
    if (!claimingGift) return
    try {
      if (claimEditMode && claimingGift.claim) {
        await api.put(`/api/gifts/${claimingGift.id}/claim`, { giftDate })
      } else {
        await api.post(`/api/gifts/${claimingGift.id}/claim`, { giftDate })
      }
      closeClaimModal()
      await loadGifts()
    } catch (err) {
      console.error('Failed to claim gift:', err)
      alert(err.message)
    }
  }

  async function handleUnclaimGift() {
    if (!claimingGift) return
    try {
      await api.delete(`/api/gifts/${claimingGift.id}/claim`)
      closeClaimModal()
      await loadGifts()
    } catch (err) {
      console.error('Failed to unclaim gift:', err)
      alert(err.message)
    }
  }

  function openClaimModal(gift) {
    setClaimingGift(gift)
    setClaimEditMode(!!gift.claim)
  }

  function closeClaimModal() {
    setClaimingGift(null)
    setClaimEditMode(false)
  }

  const screenTitle = isOwner ? 'My gift list' : (ownerName || 'Gift list')
  const screenSubtitle = isOwner ? null : 'Their gift ideas'
  const backTo = isAdminEdit ? '/admin' : isManageEdit ? `/list/${targetUserId}` : '/home'

  // In guardian context the backend attaches every claim. In the regular view the viewer's own
  // claim is shown via its own bar, so badges cover only the others'; in the edit view (no own-claim
  // bar) badges cover every claim, including the guardian's own, so nothing is silently hidden.
  const otherClaimsOf = (gift) => (gift.claims || []).filter(c => c.claimerUserId !== currentUser.id)
  const claimsForCard = (gift) => (canEdit ? (gift.claims || []) : otherClaimsOf(gift))

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
      {isManageEdit && (
        <div className="admin-edit-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C4.5 2 2 4.5 2 8s2.5 6 6 6 6-2.5 6-6-2.5-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="currentColor"/>
          </svg>
          <span>You're editing {ownerName || 'this'}'s list on their behalf. You can see who's giving what, so nobody buys the same thing twice.</span>
        </div>
      )}
      <TopBar
        title={screenTitle}
        subtitle={screenSubtitle}
        showBack
        backTo={backTo}
        actions={!canEdit && (
          <div className="topbar__icon-wrap">
            <button
              className="topbar__icon"
              aria-label="Filter gifts"
              onClick={() => setShowFilterSheet(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
            {hasActiveFilter && <span className="topbar__dot" />}
          </div>
        )}
      />

      <div className="gift-list__content">
        {canManage && !canEdit && (
          <button
            className="gift-list__add-button"
            onClick={() => navigate(`/manage/list/${targetUserId}`)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Manage list
          </button>
        )}

        {canEdit && (
          <button className="gift-list__add-button" onClick={() => setShowAddModal(true)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2V16M2 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add a gift idea
          </button>
        )}

        {filteredActiveGifts.length === 0 ? (
          <div className="gift-list__empty-state">
            <svg className="gift-list__empty-icon" viewBox="0 0 64 64" fill="none">
              <path d="M32 8C20 8 10 18 10 30V50C10 56 14 62 20 62H44C50 62 54 56 54 50V30C54 18 44 8 32 8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M22 28H42M22 38H42M22 48H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3 className="gift-list__empty-title">
              {hasActiveFilter ? 'No gifts match your filter' : canEdit ? 'No gift ideas yet' : 'No gift ideas'}
            </h3>
            <p className="gift-list__empty-text">
              {hasActiveFilter ? 'Try a wider price range' : canEdit ? 'Add your first gift idea using the button above' : 'Check back soon'}
            </p>
          </div>
        ) : (
          <div className="gift-list__active-stack">
            {filteredActiveGifts.map((gift, idx) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                isOwner={canEdit}
                isReceived={false}
                canMoveUp={idx > 0}
                canMoveDown={idx < filteredActiveGifts.length - 1}
                viewerClaim={canEdit ? null : gift.claim}
                otherClaims={claimsForCard(gift)}
                onEdit={() => setEditingGift(gift)}
                onDelete={() => setDeletingGift(gift)}
                onMarkReceived={() => handleMarkReceived(gift.id, true)}
                onMovePriority={(dir) => handleMovePriority(gift.id, dir)}
                onClaim={() => openClaimModal(gift)}
              />
            ))}
          </div>
        )}

        {(canEdit || canManage) && receivedGifts.length > 0 && (
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
                    isOwner={canEdit}
                    isReceived={true}
                    viewerClaim={canEdit ? null : gift.claim}
                    otherClaims={claimsForCard(gift)}
                    onMarkReceived={() => handleMarkReceived(gift.id, false)}
                    onDelete={() => setDeletingGift(gift)}
                    onClaim={() => openClaimModal(gift)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {canEdit && (showAddModal || editingGift) && (
        <GiftFormModal
          gift={editingGift}
          onSave={handleSaveGift}
          onClose={() => {
            setShowAddModal(false)
            setEditingGift(null)
          }}
        />
      )}

      {!canEdit && claimingGift && (
        <ClaimModal
          gift={claimingGift}
          isEdit={claimEditMode}
          existingDate={claimingGift.claim?.giftDate}
          onClaim={handleClaimGift}
          onUnclaim={handleUnclaimGift}
          onClose={closeClaimModal}
        />
      )}

      {canEdit && deletingGift && (
        <GiftDeleteConfirmModal
          gift={deletingGift}
          onConfirm={() => handleDeleteGift(deletingGift.id)}
          onCancel={() => setDeletingGift(null)}
        />
      )}

      {!canEdit && showFilterSheet && (
        <FilterSheet
          priceMin={priceMin}
          priceMax={priceMax}
          typeFilter={typeFilter}
          onApply={handleFilterApply}
          onClose={() => setShowFilterSheet(false)}
        />
      )}
    </div>
  )
}
