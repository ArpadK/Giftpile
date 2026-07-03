package com.giftpile.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "claims", indexes = {
  @Index(name = "idx_gift_id", columnList = "gift_id"),
  @Index(name = "idx_claimer_user_id", columnList = "claimer_user_id")
})
public class Claim {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "gift_id", nullable = false)
  private Gift gift;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "claimer_user_id", nullable = false)
  private User claimerUser;

  @Column(name = "gift_date", nullable = false)
  private LocalDate giftDate;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();

  public Claim() {}

  public Claim(Gift gift, User claimerUser, LocalDate giftDate) {
    this.gift = gift;
    this.claimerUser = claimerUser;
    this.giftDate = giftDate;
  }

  @PreUpdate
  private void onUpdate() {
    this.updatedAt = LocalDateTime.now();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Gift getGift() {
    return gift;
  }

  public void setGift(Gift gift) {
    this.gift = gift;
  }

  public User getClaimerUser() {
    return claimerUser;
  }

  public void setClaimerUser(User claimerUser) {
    this.claimerUser = claimerUser;
  }

  public LocalDate getGiftDate() {
    return giftDate;
  }

  public void setGiftDate(LocalDate giftDate) {
    this.giftDate = giftDate;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
