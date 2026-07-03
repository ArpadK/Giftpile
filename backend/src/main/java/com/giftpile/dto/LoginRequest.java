package com.giftpile.dto;

public class LoginRequest {
  public Long userId;
  public String password;

  public LoginRequest() {}

  public LoginRequest(Long userId, String password) {
    this.userId = userId;
    this.password = password;
  }
}
