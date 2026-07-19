package com.giftpile.service;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.repository.ClaimRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
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
   * - Blind / guardian context: all gifts shown (guardian additionally gets claim data attached by
   *   the caller; blind never does)
   * - Reveal context, non-repeatable claimed-by-others: gift hidden until effectiveReceived
   * - Reveal context, repeatable gifts: shown to all, only viewer's own claim exposed
   * - effectiveReceived: gift.manualReceived OR (onlyOnce && today > claim.giftDate)
   *
   * @param gifts the list of gifts to filter
   * @param viewerId the ID of the viewer
   * @param ownerId the ID of the gift list owner
   * @param context how the viewer relates to the list (see {@link ViewContext})
   * @return filtered list of gifts with claim data visibility applied
   */
  public List<Gift> filterForViewer(List<Gift> gifts, Long viewerId, Long ownerId, ViewContext context) {
    LocalDate today = LocalDate.now();

    return gifts.stream()
      .filter(gift -> shouldShowGift(gift, viewerId, ownerId, context, today))
      .collect(Collectors.toList());
  }

  /**
   * Determines if a gift should be shown to the viewer based on visibility rules.
   *
   * @param gift the gift to evaluate
   * @param viewerId the ID of the viewer
   * @param ownerId the ID of the gift list owner
   * @param context how the viewer relates to the list
   * @param today the current date for effectiveReceived computation
   * @return true if the gift should be shown to the viewer
   */
  private boolean shouldShowGift(Gift gift, Long viewerId, Long ownerId, ViewContext context, LocalDate today) {
    // Blind (owner / non-manager admin) and guardian (parent of the kid owner) both see every
    // gift, including received ones. They differ only in whether the caller attaches claim data.
    if (context == ViewContext.BLIND || context == ViewContext.GUARDIAN) {
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
