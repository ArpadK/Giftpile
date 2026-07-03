package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST Controller for gift CRUD operations.
 * Handles: POST /api/gifts, PUT /api/gifts/{id}, DELETE /api/gifts/{id},
 * PATCH /api/gifts/{id}/received, PATCH /api/gifts/{id}/priority
 */
@RestController
@RequestMapping("/api/gifts")
public class GiftController {
  private final GiftRepository giftRepository;
  private final UserRepository userRepository;
  private final ClaimRepository claimRepository;

  public GiftController(GiftRepository giftRepository, UserRepository userRepository, ClaimRepository claimRepository) {
    this.giftRepository = giftRepository;
    this.userRepository = userRepository;
    this.claimRepository = claimRepository;
  }

  private User getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return userRepository.findByName(auth.getName()).orElse(null);
  }

  @PostMapping
  public ResponseEntity<GiftDTO> createGift(@RequestBody CreateGiftRequest req) {
    User current = getCurrentUser();
    if (current == null) return ResponseEntity.status(401).build();

    // A user may only add gifts to their own list; admins may add to anyone's list.
    if (!req.ownerId.equals(current.getId()) && !current.getIsAdmin()) {
      return ResponseEntity.status(403).build();
    }

    User owner = userRepository.findById(req.ownerId)
      .orElseThrow(() -> new RuntimeException("Owner not found"));

    List<Gift> ownerGifts = giftRepository.findByOwnerId(owner.getId());
    int nextPriority = ownerGifts.isEmpty() ? 0 : ownerGifts.stream().mapToInt(Gift::getPriority).max().orElse(0) + 1;

    Gift gift = new Gift(owner, req.title, nextPriority);
    gift.setLink(req.link);
    gift.setPrice(req.price);
    gift.setDescription(req.description);
    gift.setExactColor(req.exactColor != null ? req.exactColor : false);
    gift.setExactProduct(req.exactProduct != null ? req.exactProduct : false);
    gift.setOnlyOnce(req.onlyOnce != null ? req.onlyOnce : true);

    Gift saved = giftRepository.save(gift);
    return ResponseEntity.status(HttpStatus.CREATED).body(new GiftDTO(saved, null, false));
  }

  @PutMapping("/{id}")
  public ResponseEntity<GiftDTO> updateGift(@PathVariable Long id, @RequestBody UpdateGiftRequest req) {
    User current = getCurrentUser();
    Gift gift = giftRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Gift not found"));

    if (!gift.getOwner().getId().equals(current.getId()) && !current.getIsAdmin()) {
      return ResponseEntity.status(403).build();
    }

    if (req.title != null) gift.setTitle(req.title);
    if (req.link != null) gift.setLink(req.link);
    if (req.price != null) gift.setPrice(req.price);
    if (req.description != null) gift.setDescription(req.description);
    if (req.exactColor != null) gift.setExactColor(req.exactColor);
    if (req.exactProduct != null) gift.setExactProduct(req.exactProduct);
    if (req.onlyOnce != null) gift.setOnlyOnce(req.onlyOnce);

    Gift saved = giftRepository.save(gift);
    return ResponseEntity.ok(new GiftDTO(saved, null, false));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteGift(@PathVariable Long id) {
    User current = getCurrentUser();
    Gift gift = giftRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Gift not found"));

    if (!gift.getOwner().getId().equals(current.getId()) && !current.getIsAdmin()) {
      return ResponseEntity.status(403).build();
    }

    claimRepository.findByGiftId(id).forEach(claimRepository::delete);
    giftRepository.delete(gift);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/{id}/received")
  public ResponseEntity<GiftDTO> toggleReceived(@PathVariable Long id, @RequestBody Map<String, Boolean> req) {
    User current = getCurrentUser();
    Gift gift = giftRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Gift not found"));

    if (!gift.getOwner().getId().equals(current.getId()) && !current.getIsAdmin()) {
      return ResponseEntity.status(403).build();
    }

    gift.setManualReceived(req.get("received"));
    Gift saved = giftRepository.save(gift);
    return ResponseEntity.ok(new GiftDTO(saved, null, req.get("received")));
  }

  @PatchMapping("/{id}/priority")
  public ResponseEntity<Void> changePriority(@PathVariable Long id, @RequestBody Map<String, String> req) {
    User current = getCurrentUser();
    Gift gift = giftRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Gift not found"));

    if (!gift.getOwner().getId().equals(current.getId()) && !current.getIsAdmin()) {
      return ResponseEntity.status(403).build();
    }

    String direction = req.get("direction");
    List<Gift> ownerGifts = giftRepository.findByOwnerId(gift.getOwner().getId())
      .stream()
      .filter(g -> !g.getManualReceived())
      .sorted((a, b) -> Integer.compare(a.getPriority(), b.getPriority()))
      .collect(Collectors.toList());

    int currentIndex = -1;
    for (int i = 0; i < ownerGifts.size(); i++) {
      if (ownerGifts.get(i).getId().equals(id)) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex == -1) return ResponseEntity.badRequest().build();

    if ("up".equals(direction) && currentIndex > 0) {
      Gift above = ownerGifts.get(currentIndex - 1);
      int temp = gift.getPriority();
      gift.setPriority(above.getPriority());
      above.setPriority(temp);
      giftRepository.save(gift);
      giftRepository.save(above);
    } else if ("down".equals(direction) && currentIndex < ownerGifts.size() - 1) {
      Gift below = ownerGifts.get(currentIndex + 1);
      int temp = gift.getPriority();
      gift.setPriority(below.getPriority());
      below.setPriority(temp);
      giftRepository.save(gift);
      giftRepository.save(below);
    }

    return ResponseEntity.ok().build();
  }

  public static class CreateGiftRequest {
    public Long ownerId;
    public String title;
    public String link;
    public String price;
    public String description;
    public Boolean exactColor;
    public Boolean exactProduct;
    public Boolean onlyOnce;
  }

  public static class UpdateGiftRequest {
    public String title;
    public String link;
    public String price;
    public String description;
    public Boolean exactColor;
    public Boolean exactProduct;
    public Boolean onlyOnce;
  }
}
