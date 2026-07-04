package com.giftpile.dto;

import com.giftpile.entity.User;

/** User as exposed to authenticated callers (includes the admin flag). */
public record UserDTO(Long id, String name, String color, Boolean isAdmin) {
  public static UserDTO from(User user) {
    return new UserDTO(user.getId(), user.getName(), user.getColor(), user.getIsAdmin());
  }
}
