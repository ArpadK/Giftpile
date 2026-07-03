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
    List<Claim> claims = claimRepository.findByGiftId(gift.getId());

    // Blind context (owner or admin viewing/editing owner's list): show all gifts, no claim visibility
    if (isBlindContext) {
      return true;
    }

    // No claims: always show the gift
    if (claims.isEmpty()) {
      return true;
    }

    // Find if viewer has a claim on this gift
    java.util.Optional<Claim> viewerClaim = claims.stream()
      .filter(c -> c.getClaimerUser().getId().equals(viewerId))
      .findFirst();

    // If viewer is the claimer, always show
    if (viewerClaim.isPresent()) {
      return true;
    }

    // If repeatable gift, show to all viewers (claim data for others will be stripped in DTO layer)
    if (!gift.getOnlyOnce()) {
      return true;
    }

    // Non-repeatable gift claimed by someone else:
    // Show only if it's considered effectively received
    for (Claim claim : claims) {
      if (!claim.getClaimerUser().getId().equals(viewerId)) {
        boolean isEffectivelyReceived = isEffectiveReceived(gift, claim, today);
        if (!isEffectivelyReceived) {
          // Non-repeatable gift claimed by someone else and not yet received: hide it
          return false;
        }
      }
    }

    // Non-repeatable gift claimed by someone else, but effectively received: show it
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
