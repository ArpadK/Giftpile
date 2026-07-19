package com.giftpile.dto;

import com.giftpile.entity.User;

import java.util.List;

/** User as exposed to authenticated callers (includes admin/kid flags and, for kids, parents). */
public record UserDTO(Long id, String name, String color, Boolean isAdmin, Boolean isKid,
                      Boolean canLogin, List<Long> parentIds) {
  public static UserDTO from(User user) {
    return new UserDTO(user.getId(), user.getName(), user.getColor(), user.getIsAdmin(),
      user.getIsKid(), user.getCanLogin(), List.of());
  }

  public static UserDTO from(User user, List<Long> parentIds) {
    return new UserDTO(user.getId(), user.getName(), user.getColor(), user.getIsAdmin(),
      user.getIsKid(), user.getCanLogin(), parentIds);
  }
}
