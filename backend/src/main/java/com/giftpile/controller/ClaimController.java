package com.giftpile.controller;

import com.giftpile.dto.ErrorResponse;
import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.exception.NotFoundException;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

/** Claiming ("I'll give this") on other people's gifts: create, move the date, or withdraw. */
@RestController
@RequestMapping("/api/gifts/{giftId}/claim")
public class ClaimController {
  private final GiftRepository giftRepository;
  private final ClaimRepository claimRepository;
  private final CurrentUserService currentUser;

  public ClaimController(GiftRepository giftRepository, ClaimRepository claimRepository,
                         CurrentUserService currentUser) {
    this.giftRepository = giftRepository;
    this.claimRepository = claimRepository;
    this.currentUser = currentUser;
  }

  @PostMapping
  public ResponseEntity<?> claimGift(@PathVariable Long giftId, @RequestBody ClaimRequest req) {
    User claimer = currentUser.require();
    requireGiftDate(req);

    Gift gift = giftRepository.findById(giftId)
      .orElseThrow(() -> new NotFoundException("Gift not found"));

    if (gift.getOwner().getId().equals(claimer.getId())) {
      throw new IllegalArgumentException("You cannot claim a gift on your own list");
    }

    // Re-claiming a gift you already claimed just moves the date (prevents duplicate claims,
    // which would otherwise break the one-claim-per-user-per-gift lookups).
    Optional<Claim> existing = claimRepository.findByClaimerUserIdAndGiftId(claimer.getId(), giftId);
    if (existing.isPresent()) {
      Claim claim = existing.get();
      claim.setGiftDate(req.giftDate());
      claimRepository.save(claim);
      return ResponseEntity.ok(Map.of("claimed", true));
    }

    // Non-repeatable gifts allow only one claim in total; any existing claim is someone else's.
    if (gift.getOnlyOnce() && !claimRepository.findByGiftId(giftId).isEmpty()) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new ErrorResponse("Gift already claimed by another user"));
    }

    claimRepository.save(new Claim(gift, claimer, req.giftDate()));
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("claimed", true));
  }

  @PutMapping
  public Map<String, Boolean> updateClaim(@PathVariable Long giftId, @RequestBody ClaimRequest req) {
    User claimer = currentUser.require();
    requireGiftDate(req);

    Claim claim = claimRepository.findByClaimerUserIdAndGiftId(claimer.getId(), giftId)
      .orElseThrow(() -> new NotFoundException("Claim not found"));

    claim.setGiftDate(req.giftDate());
    claimRepository.save(claim);
    return Map.of("updated", true);
  }

  @DeleteMapping
  public ResponseEntity<Void> unclaimGift(@PathVariable Long giftId) {
    User claimer = currentUser.require();
    Claim claim = claimRepository.findByClaimerUserIdAndGiftId(claimer.getId(), giftId)
      .orElseThrow(() -> new NotFoundException("Claim not found"));

    claimRepository.delete(claim);
    return ResponseEntity.ok().build();
  }

  private void requireGiftDate(ClaimRequest req) {
    if (req.giftDate() == null) {
      throw new IllegalArgumentException("Gift date is required");
    }
  }

  public record ClaimRequest(LocalDate giftDate) {}
}
