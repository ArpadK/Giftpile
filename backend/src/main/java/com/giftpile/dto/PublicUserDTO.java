package com.giftpile.dto;

import com.giftpile.entity.User;

/** User as exposed before login (the login screen's picker): no admin flag. */
public record PublicUserDTO(Long id, String name, String color) {
  public static PublicUserDTO from(User user) {
    return new PublicUserDTO(user.getId(), user.getName(), user.getColor());
  }
}
