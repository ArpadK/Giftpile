package com.giftpile.dto;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.GiftType;

import java.time.LocalDate;
import java.util.List;

/**
 * Gift as exposed over the API. {@code claim} is only ever the viewer's own claim (or null).
 * {@code claims} is populated only in guardian context (a parent viewing their kid's list): it
 * lists every claim with the claimer's identity so guardians can coordinate. In every other
 * context {@code claims} is null and other people's claims are never serialized.
 */
public record GiftDTO(
  Long id,
  String title,
  String link,
  String price,
  String description,
  Boolean exactColor,
  Boolean exactProduct,
  Boolean onlyOnce,
  Boolean manualReceived,
  Boolean effectiveReceived,
  Integer priority,
  GiftType type,
  ClaimDTO claim,
  List<ClaimSummaryDTO> claims
) {
  public static GiftDTO of(Gift gift, Claim viewerClaim, boolean effectiveReceived) {
    return of(gift, viewerClaim, effectiveReceived, null);
  }

  public static GiftDTO of(Gift gift, Claim viewerClaim, boolean effectiveReceived,
                           List<ClaimSummaryDTO> claims) {
    return new GiftDTO(
      gift.getId(),
      gift.getTitle(),
      gift.getLink(),
      gift.getPrice(),
      gift.getDescription(),
      gift.getExactColor(),
      gift.getExactProduct(),
      gift.getOnlyOnce(),
      gift.getManualReceived(),
      effectiveReceived,
      gift.getPriority(),
      gift.getType(),
      viewerClaim == null ? null : ClaimDTO.from(viewerClaim),
      claims
    );
  }

  public record ClaimDTO(Long id, Long claimerUserId, LocalDate giftDate) {
    public static ClaimDTO from(Claim claim) {
      return new ClaimDTO(claim.getId(), claim.getClaimerUser().getId(), claim.getGiftDate());
    }
  }

  /** A single claim with claimer identity — only ever exposed in guardian context. */
  public record ClaimSummaryDTO(Long claimerUserId, String claimerName, String claimerColor,
                                LocalDate giftDate) {
    public static ClaimSummaryDTO from(Claim claim) {
      return new ClaimSummaryDTO(
        claim.getClaimerUser().getId(),
        claim.getClaimerUser().getName(),
        claim.getClaimerUser().getColor(),
        claim.getGiftDate());
    }
  }
}
