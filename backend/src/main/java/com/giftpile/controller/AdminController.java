package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.dto.UserDTO;
import com.giftpile.entity.User;
import com.giftpile.exception.NotFoundException;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import com.giftpile.service.AdminService;
import com.giftpile.service.CurrentUserService;
import com.giftpile.service.GiftVisibilityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** User management for admins. Gated to ROLE_ADMIN in the security config. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private static final String[] COLORS = {"#4C5FE8", "#FF6B6B", "#F2A93B", "#2EC4B6", "#8B5CF6", "#FF8FB1"};

  private final UserRepository userRepository;
  private final GiftRepository giftRepository;
  private final PasswordEncoder passwordEncoder;
  private final GiftVisibilityService visibilityService;
  private final AdminService adminService;
  private final CurrentUserService currentUser;

  public AdminController(UserRepository userRepository, GiftRepository giftRepository,
                         PasswordEncoder passwordEncoder, GiftVisibilityService visibilityService,
                         AdminService adminService, CurrentUserService currentUser) {
    this.userRepository = userRepository;
    this.giftRepository = giftRepository;
    this.passwordEncoder = passwordEncoder;
    this.visibilityService = visibilityService;
    this.adminService = adminService;
    this.currentUser = currentUser;
  }

  @GetMapping("/users")
  public List<UserDTO> getAllUsers() {
    return userRepository.findAll().stream().map(UserDTO::from).toList();
  }

  @PostMapping("/users")
  public ResponseEntity<UserDTO> createUser(@RequestBody UserRequest req) {
    if (req.name() == null || req.name().isBlank()) {
      throw new IllegalArgumentException("Name is required");
    }
    if (req.password() == null || req.password().isEmpty()) {
      throw new IllegalArgumentException("Password is required");
    }
    if (userRepository.findByName(req.name()).isPresent()) {
      throw new IllegalArgumentException("A user with that name already exists");
    }

    String color = COLORS[(int) (userRepository.count() % COLORS.length)];
    User user = new User(req.name(), passwordEncoder.encode(req.password()), color);
    user.setIsAdmin(Boolean.TRUE.equals(req.isAdmin()));

    User saved = userRepository.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(UserDTO.from(saved));
  }

  @PutMapping("/users/{id}")
  public UserDTO updateUser(@PathVariable Long id, @RequestBody UserRequest req) {
    User user = userRepository.findById(id)
      .orElseThrow(() -> new NotFoundException("User not found"));

    if (req.name() != null && !req.name().equals(user.getName())) {
      if (req.name().isBlank()) {
        throw new IllegalArgumentException("Name is required");
      }
      if (userRepository.findByName(req.name()).isPresent()) {
        throw new IllegalArgumentException("A user with that name already exists");
      }
      user.setName(req.name());
    }
    if (req.password() != null && !req.password().isEmpty()) {
      user.setPasswordHash(passwordEncoder.encode(req.password()));
    }
    if (req.isAdmin() != null) {
      if (!req.isAdmin() && user.getIsAdmin() && adminService.getAdminCount() == 1) {
        throw new IllegalArgumentException("Cannot remove the last admin");
      }
      user.setIsAdmin(req.isAdmin());
    }

    return UserDTO.from(userRepository.save(user));
  }

  @DeleteMapping("/users/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    User current = currentUser.require();

    Optional<String> validationError = adminService.validateDeletion(id, current.getId());
    if (validationError.isPresent()) {
      throw new IllegalArgumentException(validationError.get());
    }

    adminService.deleteUser(id);
    return ResponseEntity.ok().build();
  }

  /**
   * The gifts of a user, as seen by an admin editing their list. This is a blind context — the
   * admin sees every gift (including received ones) but never any claim data.
   */
  @GetMapping("/users/{id}/gifts")
  public List<GiftDTO> getUserGifts(@PathVariable Long id) {
    User user = userRepository.findById(id)
      .orElseThrow(() -> new NotFoundException("User not found"));

    LocalDate today = LocalDate.now();
    return giftRepository.findByOwnerIdOrderByStatus(user.getId()).stream()
      .map(gift -> GiftDTO.of(gift, null, visibilityService.isEffectiveReceived(gift, null, today)))
      .toList();
  }

  public record UserRequest(String name, String password, Boolean isAdmin) {}
}
