package com.giftpile.service;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.repository.ClaimRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GiftVisibilityService {
  private final ClaimRepository claimRepository;

  public GiftVisibilityService(ClaimRepository claimRepository) {
    this.claimRepository = claimRepository;
  }

  /**
   * Filters a list of gifts based on visibility rules for a specific viewer.
   *
   * Rules:
   * - Blind context (owner viewing own list): all gifts shown, no claim data exposed
   * - Non-repeatable claimed-by-others (non-blind): gift hidden until effectiveReceived
   * - Repeatable gifts: shown to all, only viewer's own claim exposed (others' claims stripped)
   * - effectiveReceived: gift.manualReceived OR (onlyOnce && today > claim.giftDate)
   *
   * @param gifts the list of gifts to filter
   * @param viewerId the ID of the viewer
   * @param ownerId the ID of the gift list owner
   * @param isBlindContext true if viewer is owner/admin editing owner's list
   * @return filtered list of gifts with claim data visibility applied
   */
  public List<Gift> filterForViewer(List<Gift> gifts, Long viewerId, Long ownerId, boolean isBlindContext) {
    LocalDate today = LocalDate.now();

    return gifts.stream()
      .filter(gift -> shouldShowGift(gift, viewerId, ownerId, isBlindContext, today))
      .collect(Collectors.toList());
  }

  /**
   * Determines if a gift should be shown to the viewer based on visibility rules.
   *
   * @param gift the gift to evaluate
   * @param viewerId the ID of the viewer
   * @param ownerId the ID of the gift list owner
   * @param isBlindContext true if in blind context (owner or admin editing owner's list)
   * @param today the current date for effectiveReceived computation
   * @return true if the gift should be shown to the viewer
   */
  private boolean shouldShowGift(Gift gift, Long viewerId, Long ownerId, boolean isBlindContext, LocalDate today) {
    // Blind context (owner viewing their own list, or admin editing it): show all gifts.
    // Received gifts are only ever visible in this context.
    if (isBlindContext) {
      return true;
    }

    List<Claim> claims = claimRepository.findByGiftId(gift.getId());

    // The claimer always sees their own claim (even after it resolves) so they can edit/undo it.
    boolean viewerHasClaim = claims.stream()
      .anyMatch(c -> c.getClaimerUser().getId().equals(viewerId));
    if (viewerHasClaim) {
      return true;
    }

    // Gifts the owner has marked as received are private to the owner — never shown to others.
    if (gift.getManualReceived()) {
      return false;
    }

    // Repeatable gifts stay available to everyone regardless of others' claims.
    if (!gift.getOnlyOnce()) {
      return true;
    }

    // Non-repeatable gift claimed by someone else: hidden from other viewers, both before and
    // after the gift date resolves it to "received" (received items stay private to the owner).
    boolean claimedByOther = claims.stream()
      .anyMatch(c -> !c.getClaimerUser().getId().equals(viewerId));
    if (claimedByOther) {
      return false;
    }

    // Unclaimed, not received: available to view and claim.
    return true;
  }

  /**
   * Computes if a gift is effectively received.
   *
   * A gift is effectively received if:
   * - It's manually marked as received, OR
   * - It's non-repeatable AND a claim exists AND today is after the claim's gift date
   *
   * @param gift the gift to evaluate
   * @param claim the claim (if any) associated with the gift
   * @param today the current date
   * @return true if the gift is effectively received
   */
  public boolean isEffectiveReceived(Gift gift, Claim claim, LocalDate today) {
    // Manual received flag always counts as received
    if (gift.getManualReceived()) {
      return true;
    }

    // For non-repeatable gifts: received if today is after the claim date
    if (gift.getOnlyOnce() && claim != null && today.isAfter(claim.getGiftDate())) {
      return true;
    }

    return false;
  }
}
