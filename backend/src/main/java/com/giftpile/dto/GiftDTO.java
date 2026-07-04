package com.giftpile.dto;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.GiftType;

import java.time.LocalDate;

/**
 * Gift as exposed over the API. {@code claim} is only ever the viewer's own claim (or null);
 * other people's claims are never serialized.
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
  ClaimDTO claim
) {
  public static GiftDTO of(Gift gift, Claim viewerClaim, boolean effectiveReceived) {
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
      viewerClaim == null ? null : ClaimDTO.from(viewerClaim)
    );
  }

  public record ClaimDTO(Long id, Long claimerUserId, LocalDate giftDate) {
    public static ClaimDTO from(Claim claim) {
      return new ClaimDTO(claim.getId(), claim.getClaimerUser().getId(), claim.getGiftDate());
    }
  }
}
