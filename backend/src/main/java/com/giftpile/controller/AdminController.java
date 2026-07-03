package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.dto.UserDTO;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import com.giftpile.service.AdminService;
import com.giftpile.service.GiftVisibilityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private static final String[] COLORS = {"#4C5FE8", "#FF6B6B", "#F2A93B", "#2EC4B6", "#8B5CF6", "#FF8FB1"};

  private final UserRepository userRepository;
  private final GiftRepository giftRepository;
  private final PasswordEncoder passwordEncoder;
  private final GiftVisibilityService visibilityService;
  private final AdminService adminService;

  public AdminController(UserRepository userRepository, GiftRepository giftRepository,
                         PasswordEncoder passwordEncoder,
                         GiftVisibilityService visibilityService, AdminService adminService) {
    this.userRepository = userRepository;
    this.giftRepository = giftRepository;
    this.passwordEncoder = passwordEncoder;
    this.visibilityService = visibilityService;
    this.adminService = adminService;
  }

  private User getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null) return null;
    return userRepository.findByName(auth.getName()).orElse(null);
  }

  @GetMapping("/users")
  public ResponseEntity<List<UserDTO>> getAllUsers() {
    List<UserDTO> users = userRepository.findAll().stream()
      .map(UserDTO::from)
      .collect(Collectors.toList());
    return ResponseEntity.ok(users);
  }

  @PostMapping("/users")
  public ResponseEntity<?> createUser(@RequestBody CreateUserRequest req) {
    if (req.name == null || req.name.isBlank() || req.password == null || req.password.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Name and password are required"));
    }
    if (userRepository.findByName(req.name).isPresent()) {
      return ResponseEntity.status(400).body(Map.of("error", "User already exists"));
    }

    long userCount = userRepository.count();
    String color = COLORS[(int) (userCount % COLORS.length)];

    User user = new User(req.name, passwordEncoder.encode(req.password), color);
    user.setIsAdmin(req.isAdmin != null ? req.isAdmin : false);

    User saved = userRepository.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(UserDTO.from(saved));
  }

  @PutMapping("/users/{id}")
  public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest req) {
    User user = userRepository.findById(id).orElse(null);
    if (user == null) {
      return ResponseEntity.notFound().build();
    }

    long adminCount = adminService.getAdminCount();

    // Prevent removing admin rights from the last remaining admin.
    if (req.isAdmin != null && !req.isAdmin && user.getIsAdmin() && adminCount == 1) {
      return ResponseEntity.status(400).body(Map.of("error", "Cannot remove the last admin"));
    }

    if (req.name != null) user.setName(req.name);
    if (req.password != null && !req.password.isEmpty()) {
      user.setPasswordHash(passwordEncoder.encode(req.password));
    }
    if (req.isAdmin != null) user.setIsAdmin(req.isAdmin);

    User saved = userRepository.save(user);
    return ResponseEntity.ok(UserDTO.from(saved));
  }

  @DeleteMapping("/users/{id}")
  public ResponseEntity<?> deleteUser(@PathVariable Long id) {
    User current = getCurrentUser();
    if (current == null) {
      return ResponseEntity.status(401).build();
    }

    Optional<String> validationError = adminService.validateDeletion(id, current.getId());
    if (validationError.isPresent()) {
      return ResponseEntity.status(400).body(Map.of("error", validationError.get()));
    }

    adminService.deleteUser(id);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/users/{id}/gifts")
  public ResponseEntity<List<GiftDTO>> getUserGifts(@PathVariable Long id) {
    User user = userRepository.findById(id).orElse(null);
    if (user == null) {
      return ResponseEntity.notFound().build();
    }

    List<Gift> gifts = giftRepository.findByOwnerIdOrderByStatus(user.getId());

    // Admin viewing a user's gifts is a blind context (like the owner viewing their own list):
    // no claim data is exposed, so the admin can't see who is giving what.
    List<Gift> filtered = visibilityService.filterForViewer(gifts, id, id, true);

    List<GiftDTO> dtos = filtered.stream()
      .map(gift -> {
        boolean effectiveReceived = visibilityService.isEffectiveReceived(gift, null, LocalDate.now());
        return new GiftDTO(gift, null, effectiveReceived);
      })
      .collect(Collectors.toList());

    return ResponseEntity.ok(dtos);
  }

  public static class CreateUserRequest {
    public String name;
    public String password;
    public Boolean isAdmin;
  }

  public static class UpdateUserRequest {
    public String name;
    public String password;
    public Boolean isAdmin;
  }
}
