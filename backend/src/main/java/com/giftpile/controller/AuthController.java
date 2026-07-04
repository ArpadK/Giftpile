package com.giftpile.controller;

import com.giftpile.dto.ErrorResponse;
import com.giftpile.dto.UserDTO;
import com.giftpile.entity.User;
import com.giftpile.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

/** Session auth: first-run bootstrap, login, logout, and the current-user probe. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserRepository userRepository;
  private final AuthenticationManager authenticationManager;
  private final PasswordEncoder passwordEncoder;
  private final SecurityContextRepository securityContextRepository;

  public AuthController(UserRepository userRepository,
                        AuthenticationManager authenticationManager,
                        PasswordEncoder passwordEncoder,
                        SecurityContextRepository securityContextRepository) {
    this.userRepository = userRepository;
    this.authenticationManager = authenticationManager;
    this.passwordEncoder = passwordEncoder;
    this.securityContextRepository = securityContextRepository;
  }

  /**
   * Bootstrap endpoint: creates the very first user (always an admin) while no users exist yet.
   * Once a user exists this returns 403 — further accounts go through {@code /api/admin/users}.
   */
  @PostMapping("/users")
  public ResponseEntity<?> bootstrapFirstUser(@RequestBody BootstrapRequest request) {
    if (userRepository.count() > 0) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(new ErrorResponse("Initial setup already completed"));
    }
    if (request.name() == null || request.name().isBlank()
        || request.password() == null || request.password().isEmpty()) {
      throw new IllegalArgumentException("Name and password are required");
    }

    User user = new User(request.name().trim(), passwordEncoder.encode(request.password()), "#4C5FE8");
    user.setIsAdmin(true);
    User saved = userRepository.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(UserDTO.from(saved));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest request,
                                 HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    User user = request.userId() == null ? null : userRepository.findById(request.userId()).orElse(null);
    if (user == null) {
      return invalidCredentials();
    }

    try {
      Authentication auth = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(user.getName(), request.password()));

      // Since Spring Security 6 the context set on the holder is not persisted automatically;
      // explicitly store it in the session so subsequent requests are authenticated.
      SecurityContext context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(auth);
      SecurityContextHolder.setContext(context);
      securityContextRepository.saveContext(context, httpRequest, httpResponse);

      return ResponseEntity.ok(UserDTO.from(user));
    } catch (AuthenticationException e) {
      return invalidCredentials();
    }
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpSession session) {
    session.invalidate();
    SecurityContextHolder.clearContext();
    return ResponseEntity.ok().build();
  }

  @GetMapping("/me")
  public ResponseEntity<?> getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
      return userRepository.findByName(auth.getName())
        .<ResponseEntity<?>>map(user -> ResponseEntity.ok(UserDTO.from(user)))
        .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  private ResponseEntity<ErrorResponse> invalidCredentials() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Invalid credentials"));
  }

  public record BootstrapRequest(String name, String password) {}

  public record LoginRequest(Long userId, String password) {}
}
