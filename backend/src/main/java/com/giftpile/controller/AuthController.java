package com.giftpile.controller;

import com.giftpile.dto.CreateUserRequest;
import com.giftpile.dto.LoginRequest;
import com.giftpile.dto.UserDTO;
import com.giftpile.entity.User;
import com.giftpile.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserRepository userRepository;
  private final AuthenticationManager authenticationManager;
  private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
  private final SecurityContextRepository securityContextRepository;

  public AuthController(UserRepository userRepository,
                        AuthenticationManager authenticationManager,
                        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                        SecurityContextRepository securityContextRepository) {
    this.userRepository = userRepository;
    this.authenticationManager = authenticationManager;
    this.passwordEncoder = passwordEncoder;
    this.securityContextRepository = securityContextRepository;
  }

  @GetMapping("/users")
  public ResponseEntity<List<UserDTO>> getAllUsers() {
    List<UserDTO> users = userRepository.findAll().stream()
      .map(UserDTO::from)
      .collect(Collectors.toList());
    return ResponseEntity.ok(users);
  }

  /**
   * Bootstrap endpoint: creates the very first user (as an admin) when no users exist yet.
   * Once at least one user exists this is closed off — further accounts must be created by an
   * authenticated admin via {@code /api/admin/users}. This prevents anonymous privilege escalation.
   */
  @PostMapping("/users")
  public ResponseEntity<?> bootstrapFirstUser(@RequestBody CreateUserRequest request) {
    if (userRepository.count() > 0) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(new ErrorResponse("Initial setup already completed"));
    }
    if (request.name == null || request.name.isBlank()
        || request.password == null || request.password.isEmpty()) {
      return ResponseEntity.badRequest().body(new ErrorResponse("Name and password are required"));
    }

    User user = new User();
    user.setName(request.name);
    user.setPasswordHash(passwordEncoder.encode(request.password));
    user.setColor(request.color != null ? request.color : "#4C5FE8");
    // The first account is always an admin so the instance is manageable.
    user.setIsAdmin(true);
    User saved = userRepository.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(UserDTO.from(saved));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpSession session,
                                 HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    User user = userRepository.findById(request.userId).orElse(null);
    if (user == null) {
      return ResponseEntity.status(401).body(new ErrorResponse("Invalid credentials"));
    }

    try {
      Authentication auth = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(user.getName(), request.password)
      );

      // Since Spring Security 6 the context set on the holder is not persisted automatically;
      // explicitly store it in the session so subsequent requests are authenticated.
      SecurityContext context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(auth);
      SecurityContextHolder.setContext(context);
      securityContextRepository.saveContext(context, httpRequest, httpResponse);
      session.setAttribute("userId", user.getId());

      return ResponseEntity.ok(UserDTO.from(user));
    } catch (AuthenticationException e) {
      return ResponseEntity.status(401).body(new ErrorResponse("Invalid credentials"));
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
    if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
      return userRepository.findByName(auth.getName())
        .<ResponseEntity<?>>map(user -> ResponseEntity.ok(UserDTO.from(user)))
        .orElseGet(() -> ResponseEntity.status(401).build());
    }
    return ResponseEntity.status(401).build();
  }

  public static class ErrorResponse {
    public String message;

    public ErrorResponse(String message) {
      this.message = message;
    }
  }
}
