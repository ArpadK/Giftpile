package com.giftpile.dto;

import com.giftpile.entity.User;

public class UserDTO {
  public Long id;
  public String name;
  public String color;
  public Boolean isAdmin;

  public UserDTO() {}

  public UserDTO(User user) {
    this.id = user.getId();
    this.name = user.getName();
    this.color = user.getColor();
    this.isAdmin = user.getIsAdmin();
  }

  public static UserDTO from(User user) {
    return new UserDTO(user);
  }
}
