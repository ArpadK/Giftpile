package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.dto.PublicUserDTO;
import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import com.giftpile.service.GiftVisibilityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserRepository userRepository;
  private final GiftRepository giftRepository;
  private final ClaimRepository claimRepository;
  private final GiftVisibilityService visibilityService;

  public UserController(UserRepository userRepository, GiftRepository giftRepository,
                        ClaimRepository claimRepository, GiftVisibilityService visibilityService) {
    this.userRepository = userRepository;
    this.giftRepository = giftRepository;
    this.claimRepository = claimRepository;
    this.visibilityService = visibilityService;
  }

  private User getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return userRepository.findByName(auth.getName()).orElse(null);
  }

  @GetMapping
  public ResponseEntity<List<PublicUserDTO>> getAllUsers() {
    List<PublicUserDTO> users = userRepository.findAll().stream()
      .map(PublicUserDTO::from)
      .collect(Collectors.toList());
    return ResponseEntity.ok(users);
  }

  @GetMapping("/{id}/gifts/count")
  public ResponseEntity<Map<String, Long>> getGiftCount(@PathVariable Long id) {
    List<Gift> gifts = giftRepository.findByOwnerId(id);
    long activeCount = gifts.stream()
      .filter(g -> !g.getManualReceived())
      .count();
    return ResponseEntity.ok(Map.of("activeCount", activeCount));
  }

  @GetMapping("/{id}/gifts")
  public ResponseEntity<List<GiftDTO>> getGifts(@PathVariable Long id) {
    User viewer = getCurrentUser();
    if (viewer == null) return ResponseEntity.status(401).build();

    List<Gift> gifts = giftRepository.findByOwnerIdOrderByStatus(id);
    boolean isBlindContext = id.equals(viewer.getId());

    List<Gift> filtered = visibilityService.filterForViewer(gifts, viewer.getId(), id, isBlindContext);

    List<GiftDTO> dtos = filtered.stream()
      .map(gift -> {
        Claim claim = null;
        if (!isBlindContext) {
          Optional<Claim> maybeClaim = claimRepository.findByClaimerUserIdAndGiftId(viewer.getId(), gift.getId());
          if (maybeClaim.isPresent()) {
            claim = maybeClaim.get();
          }
        }
        boolean effectiveReceived = visibilityService.isEffectiveReceived(gift, claim, java.time.LocalDate.now());
        return new GiftDTO(gift, claim, effectiveReceived);
      })
      .collect(Collectors.toList());

    return ResponseEntity.ok(dtos);
  }
}
