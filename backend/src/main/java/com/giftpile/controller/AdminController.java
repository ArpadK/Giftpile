package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.dto.UserDTO;
import com.giftpile.entity.KidManager;
import com.giftpile.entity.User;
import com.giftpile.exception.NotFoundException;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.KidManagerRepository;
import com.giftpile.repository.UserRepository;
import com.giftpile.service.AdminService;
import com.giftpile.service.CurrentUserService;
import com.giftpile.service.GiftVisibilityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** User management for admins. Gated to ROLE_ADMIN in the security config. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private static final String[] COLORS = {"#4C5FE8", "#FF6B6B", "#F2A93B", "#2EC4B6", "#8B5CF6", "#FF8FB1"};

  private final UserRepository userRepository;
  private final GiftRepository giftRepository;
  private final KidManagerRepository kidManagerRepository;
  private final PasswordEncoder passwordEncoder;
  private final GiftVisibilityService visibilityService;
  private final AdminService adminService;
  private final CurrentUserService currentUser;

  public AdminController(UserRepository userRepository, GiftRepository giftRepository,
                         KidManagerRepository kidManagerRepository, PasswordEncoder passwordEncoder,
                         GiftVisibilityService visibilityService, AdminService adminService,
                         CurrentUserService currentUser) {
    this.userRepository = userRepository;
    this.giftRepository = giftRepository;
    this.kidManagerRepository = kidManagerRepository;
    this.passwordEncoder = passwordEncoder;
    this.visibilityService = visibilityService;
    this.adminService = adminService;
    this.currentUser = currentUser;
  }

  @GetMapping("/users")
  public List<UserDTO> getAllUsers() {
    return userRepository.findAll().stream().map(this::toDto).toList();
  }

  @PostMapping("/users")
  @Transactional
  public ResponseEntity<UserDTO> createUser(@RequestBody UserRequest req) {
    if (req.name() == null || req.name().isBlank()) {
      throw new IllegalArgumentException("Name is required");
    }
    if (userRepository.findByName(req.name()).isPresent()) {
      throw new IllegalArgumentException("A user with that name already exists");
    }

    boolean isKid = Boolean.TRUE.equals(req.isKid());
    boolean isAdmin = Boolean.TRUE.equals(req.isAdmin());
    if (isKid && isAdmin) {
      throw new IllegalArgumentException("A kid account cannot be an admin");
    }
    // Full users always log in; kids do so only when explicitly allowed.
    boolean canLogin = !isKid || Boolean.TRUE.equals(req.canLogin());
    if (canLogin && (req.password() == null || req.password().isEmpty())) {
      throw new IllegalArgumentException("Password is required");
    }

    String color = COLORS[(int) (userRepository.count() % COLORS.length)];
    User user = new User(req.name(), passwordHashFor(req.password(), canLogin), color);
    user.setIsAdmin(isAdmin);
    user.setIsKid(isKid);
    user.setCanLogin(canLogin);

    User saved = userRepository.save(user);
    if (isKid) {
      setParents(saved, req.parentIds());
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
  }

  @PutMapping("/users/{id}")
  @Transactional
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

    boolean finalIsAdmin = req.isAdmin() != null ? req.isAdmin() : user.getIsAdmin();
    boolean finalIsKid = req.isKid() != null ? req.isKid() : user.getIsKid();
    if (finalIsKid && finalIsAdmin) {
      throw new IllegalArgumentException("A kid account cannot be an admin");
    }
    if (req.isAdmin() != null && !req.isAdmin() && user.getIsAdmin()
        && adminService.getAdminCount() == 1) {
      throw new IllegalArgumentException("Cannot remove the last admin");
    }

    // Full users always log in; a kid logs in only when allowed. Turning login on for an account
    // that was locked (a no-login kid) needs a password, since the stored hash is unusable.
    boolean finalCanLogin = !finalIsKid
      || (req.canLogin() != null ? req.canLogin() : user.getCanLogin());
    boolean hasNewPassword = req.password() != null && !req.password().isEmpty();
    if (finalCanLogin && !user.getCanLogin() && !hasNewPassword) {
      throw new IllegalArgumentException("Password is required to enable login");
    }
    if (hasNewPassword) {
      user.setPasswordHash(passwordEncoder.encode(req.password()));
    } else if (!finalCanLogin && user.getCanLogin()) {
      // Login being turned off: lock the account with an unusable hash.
      user.setPasswordHash(lockedHash());
    }

    user.setIsAdmin(finalIsAdmin);
    user.setIsKid(finalIsKid);
    user.setCanLogin(finalCanLogin);
    User saved = userRepository.save(user);

    if (!finalIsKid) {
      // Upgrading out of kid status removes all parent access.
      kidManagerRepository.deleteByKidUserId(saved.getId());
    } else {
      // A kid may never manage another kid, so drop any manager links this user held before
      // becoming a kid; then reconcile their own parents.
      kidManagerRepository.deleteByManagerUserId(saved.getId());
      if (req.parentIds() != null) {
        setParents(saved, req.parentIds());
      }
    }

    return toDto(saved);
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

  /** Replaces a kid's parents with the given non-kid users. */
  private void setParents(User kid, List<Long> parentIds) {
    kidManagerRepository.deleteByKidUserId(kid.getId());
    if (parentIds == null) {
      return;
    }
    for (Long parentId : parentIds.stream().distinct().toList()) {
      if (parentId.equals(kid.getId())) {
        throw new IllegalArgumentException("A kid cannot be their own parent");
      }
      User parent = userRepository.findById(parentId)
        .orElseThrow(() -> new NotFoundException("Parent not found"));
      if (Boolean.TRUE.equals(parent.getIsKid())) {
        throw new IllegalArgumentException("A kid cannot manage another kid's list");
      }
      kidManagerRepository.save(new KidManager(kid.getId(), parent.getId()));
    }
  }

  private UserDTO toDto(User user) {
    if (!Boolean.TRUE.equals(user.getIsKid())) {
      return UserDTO.from(user);
    }
    List<Long> parentIds = kidManagerRepository.findByKidUserId(user.getId()).stream()
      .map(KidManager::getManagerUserId)
      .toList();
    return UserDTO.from(user, parentIds);
  }

  /** Hash to store for a new account: the encoded password, or an unusable lock for no-login kids. */
  private String passwordHashFor(String rawPassword, boolean canLogin) {
    return canLogin ? passwordEncoder.encode(rawPassword) : lockedHash();
  }

  /** A valid but unguessable bcrypt hash that no password will ever match. */
  private String lockedHash() {
    return passwordEncoder.encode(UUID.randomUUID().toString());
  }

  public record UserRequest(String name, String password, Boolean isAdmin, Boolean isKid,
                            Boolean canLogin, List<Long> parentIds) {}
}
