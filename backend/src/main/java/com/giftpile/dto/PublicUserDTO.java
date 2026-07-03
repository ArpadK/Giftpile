package com.giftpile.dto;

import com.giftpile.entity.User;

public class PublicUserDTO {
  public Long id;
  public String name;
  public String color;

  public PublicUserDTO() {}

  public PublicUserDTO(User user) {
    this.id = user.getId();
    this.name = user.getName();
    this.color = user.getColor();
  }

  public static PublicUserDTO from(User user) {
    return new PublicUserDTO(user);
  }
}
