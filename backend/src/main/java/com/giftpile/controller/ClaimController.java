package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/gifts")
public class ClaimController {
  private final GiftRepository giftRepository;
  private final ClaimRepository claimRepository;
  private final UserRepository userRepository;

  public ClaimController(GiftRepository giftRepository, ClaimRepository claimRepository, UserRepository userRepository) {
    this.giftRepository = giftRepository;
    this.claimRepository = claimRepository;
    this.userRepository = userRepository;
  }

  private User getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return userRepository.findByName(auth.getName()).orElse(null);
  }

  @PostMapping("/{id}/claim")
  public ResponseEntity<?> claimGift(@PathVariable Long id, @RequestBody ClaimRequest req) {
    User claimer = getCurrentUser();
    if (claimer == null) return ResponseEntity.status(401).build();

    Gift gift = giftRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Gift not found"));

    if (!gift.getOnlyOnce()) {
      // Repeatable gift: allow multiple claims
      Claim claim = new Claim(gift, claimer, req.giftDate);
      claimRepository.save(claim);
      return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("claimed", true));
    }

    // Non-repeatable gift: check if already claimed
    List<Claim> existingClaims = claimRepository.findByGiftId(id);
    if (!existingClaims.isEmpty() && !existingClaims.get(0).getClaimerUser().getId().equals(claimer.getId())) {
      return ResponseEntity.status(409).body(Map.of("error", "Gift already claimed by another user"));
    }

    Claim claim = new Claim(gift, claimer, req.giftDate);
    claimRepository.save(claim);
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("claimed", true));
  }

  @PutMapping("/{id}/claim")
  public ResponseEntity<?> updateClaim(@PathVariable Long id, @RequestBody ClaimRequest req) {
    User claimer = getCurrentUser();
    if (claimer == null) return ResponseEntity.status(401).build();

    Gift gift = giftRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Gift not found"));

    Claim claim = claimRepository.findByClaimerUserIdAndGiftId(claimer.getId(), id)
      .orElseThrow(() -> new RuntimeException("Claim not found"));

    claim.setGiftDate(req.giftDate);
    claimRepository.save(claim);
    return ResponseEntity.ok(Map.of("updated", true));
  }

  @DeleteMapping("/{id}/claim")
  public ResponseEntity<Void> unclaimGift(@PathVariable Long id) {
    User claimer = getCurrentUser();
    if (claimer == null) return ResponseEntity.status(401).build();

    Claim claim = claimRepository.findByClaimerUserIdAndGiftId(claimer.getId(), id)
      .orElseThrow(() -> new RuntimeException("Claim not found"));

    claimRepository.delete(claim);
    return ResponseEntity.ok().build();
  }

  public static class ClaimRequest {
    public LocalDate giftDate;
  }
}
