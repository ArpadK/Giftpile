package com.giftpile.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String name;

  @Column(nullable = false)
  private String passwordHash;

  @Column(name = "is_admin", nullable = false)
  private Boolean isAdmin = false;

  /** A kid account: a child whose list is curated by assigned parents (see kid_managers). */
  @Column(name = "is_kid", nullable = false)
  private Boolean isKid = false;

  /** Whether this user may sign in. Kids can be created without login; normal users always can. */
  @Column(name = "can_login", nullable = false)
  private Boolean canLogin = true;

  @Column(nullable = false)
  private String color;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public User() {}

  public User(String name, String passwordHash, String color) {
    this.name = name;
    this.passwordHash = passwordHash;
    this.color = color;
    this.isAdmin = false;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public Boolean getIsAdmin() {
    return isAdmin;
  }

  public void setIsAdmin(Boolean isAdmin) {
    this.isAdmin = isAdmin;
  }

  public Boolean getIsKid() {
    return isKid;
  }

  public void setIsKid(Boolean isKid) {
    this.isKid = isKid;
  }

  public Boolean getCanLogin() {
    return canLogin;
  }

  public void setCanLogin(Boolean canLogin) {
    this.canLogin = canLogin;
  }

  public String getColor() {
    return color;
  }

  public void setColor(String color) {
    this.color = color;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
