package com.giftpile.service;

import com.giftpile.entity.User;
import com.giftpile.exception.UnauthorizedException;
import com.giftpile.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

/** Resolves the {@link User} behind the current security context. */
@Service
public class CurrentUserService {
  private final UserRepository userRepository;

  public CurrentUserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Returns the authenticated user, or throws (→ 401) when there is none — e.g. the account was
   * deleted while its session was still alive.
   */
  public User require() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getName() == null) {
      throw new UnauthorizedException("Not signed in");
    }
    return userRepository.findByName(auth.getName())
      .orElseThrow(() -> new UnauthorizedException("Not signed in"));
  }

  /** The authenticated user if there is one, otherwise empty (never throws). */
  public Optional<User> currentOptional() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
      return Optional.empty();
    }
    return userRepository.findByName(auth.getName());
  }
}
