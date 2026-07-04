package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.dto.PublicUserDTO;
import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import com.giftpile.service.CurrentUserService;
import com.giftpile.service.GiftVisibilityService;
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
  private final CurrentUserService currentUser;

  public UserController(UserRepository userRepository, GiftRepository giftRepository,
                        ClaimRepository claimRepository, GiftVisibilityService visibilityService,
                        CurrentUserService currentUser) {
    this.userRepository = userRepository;
    this.giftRepository = giftRepository;
    this.claimRepository = claimRepository;
    this.visibilityService = visibilityService;
    this.currentUser = currentUser;
  }

  /** Public (pre-login) listing: names and colors only, so the login screen can render. */
  @GetMapping
  public List<PublicUserDTO> getAllUsers() {
    return userRepository.findAll().stream().map(PublicUserDTO::from).toList();
  }

  @GetMapping("/{id}/gifts/count")
  public Map<String, Long> getGiftCount(@PathVariable Long id) {
    long activeCount = giftRepository.findByOwnerId(id).stream()
      .filter(g -> !g.getManualReceived())
      .count();
    return Map.of("activeCount", activeCount);
  }

  /**
   * A user's gift list as seen by the current viewer. Viewing your own list is a blind context:
   * every gift is shown but claim data never is. Viewing someone else's list applies the reveal
   * rules (claimed/received gifts hidden) and attaches only the viewer's own claim.
   */
  @GetMapping("/{id}/gifts")
  public List<GiftDTO> getGifts(@PathVariable Long id) {
    User viewer = currentUser.require();
    boolean isBlindContext = id.equals(viewer.getId());
    LocalDate today = LocalDate.now();

    List<Gift> gifts = giftRepository.findByOwnerIdOrderByStatus(id);
    List<Gift> visible = visibilityService.filterForViewer(gifts, viewer.getId(), id, isBlindContext);

    return visible.stream()
      .map(gift -> {
        Claim claim = isBlindContext
          ? null
          : claimRepository.findByClaimerUserIdAndGiftId(viewer.getId(), gift.getId()).orElse(null);
        return GiftDTO.of(gift, claim, visibilityService.isEffectiveReceived(gift, claim, today));
      })
      .toList();
  }
}
