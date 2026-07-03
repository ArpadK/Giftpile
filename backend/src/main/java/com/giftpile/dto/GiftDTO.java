package com.giftpile.dto;

import com.giftpile.entity.Gift;
import com.giftpile.entity.Claim;
import java.time.LocalDate;

public class GiftDTO {
  public Long id;
  public String title;
  public String link;
  public String price;
  public String description;
  public Boolean exactColor;
  public Boolean exactProduct;
  public Boolean onlyOnce;
  public Boolean manualReceived;
  public Boolean effectiveReceived;
  public Integer priority;
  public ClaimDTO claim;

  public GiftDTO() {}

  public GiftDTO(Gift gift, Claim claim) {
    this.id = gift.getId();
    this.title = gift.getTitle();
    this.link = gift.getLink();
    this.price = gift.getPrice();
    this.description = gift.getDescription();
    this.exactColor = gift.getExactColor();
    this.exactProduct = gift.getExactProduct();
    this.onlyOnce = gift.getOnlyOnce();
    this.manualReceived = gift.getManualReceived();
    this.priority = gift.getPriority();
    if (claim != null) {
      this.claim = new ClaimDTO(claim);
    }
  }

  public GiftDTO(Gift gift, Claim claim, Boolean effectiveReceived) {
    this(gift, claim);
    this.effectiveReceived = effectiveReceived;
  }

  public static class ClaimDTO {
    public Long id;
    public Long claimerUserId;
    public LocalDate giftDate;

    public ClaimDTO() {}

    public ClaimDTO(Claim claim) {
      this.id = claim.getId();
      this.claimerUserId = claim.getClaimerUser().getId();
      this.giftDate = claim.getGiftDate();
    }
  }
}
