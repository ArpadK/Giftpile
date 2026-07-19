package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.dto.PublicUserDTO;
import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.exception.NotFoundException;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import com.giftpile.service.CurrentUserService;
import com.giftpile.service.GiftVisibilityService;
import com.giftpile.service.GuardianService;
import com.giftpile.service.ViewContext;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Public user listing and per-user gift lists (filtered by the reveal rules). */
@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserRepository userRepository;
  private final GiftRepository giftRepository;
  private final ClaimRepository claimRepository;
  private final GiftVisibilityService visibilityService;
  private final GuardianService guardianService;
  private final CurrentUserService currentUser;

  public UserController(UserRepository userRepository, GiftRepository giftRepository,
                        ClaimRepository claimRepository, GiftVisibilityService visibilityService,
                        GuardianService guardianService, CurrentUserService currentUser) {
    this.userRepository = userRepository;
    this.giftRepository = giftRepository;
    this.claimRepository = claimRepository;
    this.visibilityService = visibilityService;
    this.guardianService = guardianService;
    this.currentUser = currentUser;
  }

  /**
   * User listing. Unauthenticated (the pre-login picker) hides kids who cannot log in; once
   * authenticated (the Family list) every user is shown so anyone can gift a kid.
   */
  @GetMapping
  public List<PublicUserDTO> getAllUsers() {
    boolean authenticated = currentUser.currentOptional().isPresent();
    return userRepository.findAll().stream()
      .filter(u -> authenticated || canLogin(u))
      .map(PublicUserDTO::from)
      .toList();
  }

  /** List metadata for the current viewer: identity plus whether they can manage this list. */
  @GetMapping("/{id}")
  public UserListMeta getUser(@PathVariable Long id) {
    User viewer = currentUser.require();
    User owner = userRepository.findById(id)
      .orElseThrow(() -> new NotFoundException("User not found"));
    return new UserListMeta(owner.getId(), owner.getName(), owner.getColor(),
      owner.getIsKid(), guardianService.canManageList(viewer, owner));
  }

  @GetMapping("/{id}/gifts/count")
  public Map<String, Long> getGiftCount(@PathVariable Long id) {
    long activeCount = giftRepository.findByOwnerId(id).stream()
      .filter(g -> !g.getManualReceived())
      .count();
    return Map.of("activeCount", activeCount);
  }

  /**
   * A user's gift list as seen by the current viewer. The visibility context is resolved from the
   * viewer/owner relationship: blind (own list), guardian (a kid the viewer manages — every gift
   * with full claim data), or reveal (anyone else — reveal rules, only the viewer's own claim).
   */
  @GetMapping("/{id}/gifts")
  public List<GiftDTO> getGifts(@PathVariable Long id) {
    User viewer = currentUser.require();
    User owner = userRepository.findById(id)
      .orElseThrow(() -> new NotFoundException("User not found"));
    ViewContext context = guardianService.contextFor(viewer, owner);
    LocalDate today = LocalDate.now();

    List<Gift> gifts = giftRepository.findByOwnerIdOrderByStatus(id);
    List<Gift> visible = visibilityService.filterForViewer(gifts, viewer.getId(), id, context);

    return visible.stream()
      .map(gift -> toDto(gift, viewer.getId(), context, today))
      .toList();
  }

  private GiftDTO toDto(Gift gift, Long viewerId, ViewContext context, LocalDate today) {
    if (context == ViewContext.BLIND) {
      return GiftDTO.of(gift, null, visibilityService.isEffectiveReceived(gift, null, today));
    }

    if (context == ViewContext.GUARDIAN) {
      // Guardians see every claim (for coordination) and their own claim (to edit/undo it).
      List<Claim> all = claimRepository.findByGiftId(gift.getId());
      Claim ownClaim = all.stream()
        .filter(c -> c.getClaimerUser().getId().equals(viewerId))
        .findFirst().orElse(null);
      // A one-time gift has at most one claim and only it can auto-receive; repeatable never does.
      Claim receivingClaim = all.isEmpty() ? null : all.get(0);
      boolean received = visibilityService.isEffectiveReceived(gift, receivingClaim, today);
      return GiftDTO.of(gift, ownClaim, received,
        all.stream().map(GiftDTO.ClaimSummaryDTO::from).toList());
    }

    Claim claim = claimRepository.findByClaimerUserIdAndGiftId(viewerId, gift.getId()).orElse(null);
    return GiftDTO.of(gift, claim, visibilityService.isEffectiveReceived(gift, claim, today));
  }

  private boolean canLogin(User user) {
    return !(Boolean.TRUE.equals(user.getIsKid()) && !Boolean.TRUE.equals(user.getCanLogin()));
  }

  public record UserListMeta(Long id, String name, String color, Boolean isKid, boolean canManage) {}
}
