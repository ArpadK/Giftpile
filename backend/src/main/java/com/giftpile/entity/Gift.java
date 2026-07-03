package com.giftpile.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gifts", indexes = {
  @Index(name = "idx_owner_id", columnList = "owner_id"),
  @Index(name = "idx_only_once", columnList = "only_once")
})
public class Gift {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "owner_id", nullable = false)
  private User owner;

  @Column(nullable = false)
  private String title;

  @Column
  private String link;

  @Column
  private String price;

  @Column
  private String description;

  @Column(name = "exact_color", nullable = false)
  private Boolean exactColor = false;

  @Column(name = "exact_product", nullable = false)
  private Boolean exactProduct = false;

  @Column(name = "only_once", nullable = false)
  private Boolean onlyOnce = true;

  @Column(name = "manual_received", nullable = false)
  private Boolean manualReceived = false;

  @Column(nullable = false)
  private Integer priority;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();

  public Gift() {}

  public Gift(User owner, String title, Integer priority) {
    this.owner = owner;
    this.title = title;
    this.priority = priority;
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

  public User getOwner() {
    return owner;
  }

  public void setOwner(User owner) {
    this.owner = owner;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getLink() {
    return link;
  }

  public void setLink(String link) {
    this.link = link;
  }

  public String getPrice() {
    return price;
  }

  public void setPrice(String price) {
    this.price = price;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Boolean getExactColor() {
    return exactColor;
  }

  public void setExactColor(Boolean exactColor) {
    this.exactColor = exactColor;
  }

  public Boolean getExactProduct() {
    return exactProduct;
  }

  public void setExactProduct(Boolean exactProduct) {
    this.exactProduct = exactProduct;
  }

  public Boolean getOnlyOnce() {
    return onlyOnce;
  }

  public void setOnlyOnce(Boolean onlyOnce) {
    this.onlyOnce = onlyOnce;
  }

  public Boolean getManualReceived() {
    return manualReceived;
  }

  public void setManualReceived(Boolean manualReceived) {
    this.manualReceived = manualReceived;
  }

  public Integer getPriority() {
    return priority;
  }

  public void setPriority(Integer priority) {
    this.priority = priority;
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
