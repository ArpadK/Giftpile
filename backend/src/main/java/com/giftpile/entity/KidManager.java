package com.giftpile.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Objects;

/**
 * Join row assigning a manager (parent) to a kid user. Both sides reference {@code users}.
 * Kept as an explicit entity (rather than a JPA {@code @ManyToMany} collection) so fetch
 * behaviour stays boring and the membership checks are plain repository queries.
 */
@Entity
@Table(name = "kid_managers")
@IdClass(KidManager.Key.class)
public class KidManager {
  @Id
  @Column(name = "kid_user_id")
  private Long kidUserId;

  @Id
  @Column(name = "manager_user_id")
  private Long managerUserId;

  public KidManager() {}

  public KidManager(Long kidUserId, Long managerUserId) {
    this.kidUserId = kidUserId;
    this.managerUserId = managerUserId;
  }

  public Long getKidUserId() {
    return kidUserId;
  }

  public void setKidUserId(Long kidUserId) {
    this.kidUserId = kidUserId;
  }

  public Long getManagerUserId() {
    return managerUserId;
  }

  public void setManagerUserId(Long managerUserId) {
    this.managerUserId = managerUserId;
  }

  /** Composite primary key (kid + manager). */
  public static class Key implements Serializable {
    private Long kidUserId;
    private Long managerUserId;

    public Key() {}

    public Key(Long kidUserId, Long managerUserId) {
      this.kidUserId = kidUserId;
      this.managerUserId = managerUserId;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (!(o instanceof Key key)) return false;
      return Objects.equals(kidUserId, key.kidUserId)
        && Objects.equals(managerUserId, key.managerUserId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(kidUserId, managerUserId);
    }
  }
}
