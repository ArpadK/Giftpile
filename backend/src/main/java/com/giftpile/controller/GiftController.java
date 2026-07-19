package com.giftpile.controller;

import com.giftpile.dto.GiftDTO;
import com.giftpile.entity.Gift;
import com.giftpile.entity.GiftType;
import com.giftpile.entity.User;
import com.giftpile.exception.ForbiddenException;
import com.giftpile.exception.NotFoundException;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import com.giftpile.service.CurrentUserService;
import com.giftpile.service.GuardianService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;

/** CRUD for gifts: create, update, delete, mark received, and reorder within the owner's list. */
@RestController
@RequestMapping("/api/gifts")
public class GiftController {
  private final GiftRepository giftRepository;
  private final UserRepository userRepository;
  private final ClaimRepository claimRepository;
  private final CurrentUserService currentUser;
  private final GuardianService guardianService;

  public GiftController(GiftRepository giftRepository, UserRepository userRepository,
                        ClaimRepository claimRepository, CurrentUserService currentUser,
                        GuardianService guardianService) {
    this.giftRepository = giftRepository;
    this.userRepository = userRepository;
    this.claimRepository = claimRepository;
    this.currentUser = currentUser;
    this.guardianService = guardianService;
  }

  @PostMapping
  public ResponseEntity<GiftDTO> createGift(@RequestBody GiftRequest req) {
    User current = currentUser.require();
    if (req.title() == null || req.title().isBlank()) {
      throw new IllegalArgumentException("Title is required");
    }
    if (req.title().length() > 255) {
      throw new IllegalArgumentException("Title must be 255 characters or fewer");
    }
    Long ownerId = req.ownerId() != null ? req.ownerId() : current.getId();

    User owner = userRepository.findById(ownerId)
      .orElseThrow(() -> new NotFoundException("Owner not found"));

    // A user may add gifts to their own list; admins to anyone's; guardians to their kid's.
    if (!guardianService.canManageList(current, owner)) {
      throw new ForbiddenException("You can only add gifts to your own list");
    }

    int nextPriority = giftRepository.findByOwnerId(owner.getId()).stream()
      .mapToInt(Gift::getPriority)
      .max()
      .orElse(-1) + 1;

    Gift gift = new Gift(owner, req.title(), nextPriority);
    applyFields(gift, req);

    Gift saved = giftRepository.save(gift);
    return ResponseEntity.status(HttpStatus.CREATED).body(GiftDTO.of(saved, null, false));
  }

  @PutMapping("/{id}")
  public GiftDTO updateGift(@PathVariable Long id, @RequestBody GiftRequest req) {
    Gift gift = requireEditableGift(id);

    if (req.title() != null) {
      if (req.title().isBlank()) throw new IllegalArgumentException("Title cannot be blank");
      if (req.title().length() > 255) throw new IllegalArgumentException("Title must be 255 characters or fewer");
      gift.setTitle(req.title());
    }
    applyFields(gift, req);

    return GiftDTO.of(giftRepository.save(gift), null, false);
  }

  @DeleteMapping("/{id}")
  @Transactional
  public ResponseEntity<Void> deleteGift(@PathVariable Long id) {
    Gift gift = requireEditableGift(id);
    claimRepository.deleteAll(claimRepository.findByGiftId(id));
    giftRepository.delete(gift);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/{id}/received")
  @Transactional
  public GiftDTO toggleReceived(@PathVariable Long id, @RequestBody ReceivedRequest req) {
    if (req.received() == null) {
      throw new IllegalArgumentException("'received' is required");
    }
    Gift gift = requireEditableGift(id);
    gift.setManualReceived(req.received());
    if (!req.received()) {
      // Undo received: also clear any claims so the gift is fully active again.
      // A gift can be effectively received via a past-dated claim even when manualReceived=false,
      // so clearing only the flag without removing the claim would leave it stuck as received.
      claimRepository.deleteAll(claimRepository.findByGiftId(id));
    }
    return GiftDTO.of(giftRepository.save(gift), null, req.received());
  }

  @PatchMapping("/{id}/priority")
  public ResponseEntity<Void> changePriority(@PathVariable Long id, @RequestBody PriorityRequest req) {
    Gift gift = requireEditableGift(id);

    // Reordering only applies within the owner's active (not manually received) gifts.
    List<Gift> activeGifts = giftRepository.findByOwnerId(gift.getOwner().getId()).stream()
      .filter(g -> !g.getManualReceived())
      .sorted(Comparator.comparingInt(Gift::getPriority))
      .toList();

    int index = -1;
    for (int i = 0; i < activeGifts.size(); i++) {
      if (activeGifts.get(i).getId().equals(id)) {
        index = i;
        break;
      }
    }
    if (index == -1) {
      throw new IllegalArgumentException("Received gifts cannot be reordered");
    }
    gift = activeGifts.get(index);

    Gift neighbour = switch (req.direction() == null ? "" : req.direction()) {
      case "up" -> index > 0 ? activeGifts.get(index - 1) : null;
      case "down" -> index < activeGifts.size() - 1 ? activeGifts.get(index + 1) : null;
      default -> throw new IllegalArgumentException("Direction must be 'up' or 'down'");
    };

    if (neighbour != null) {
      int temp = gift.getPriority();
      gift.setPriority(neighbour.getPriority());
      neighbour.setPriority(temp);
      giftRepository.save(gift);
      giftRepository.save(neighbour);
    }

    return ResponseEntity.ok().build();
  }

  /** Loads the gift and verifies the current user may edit it (owner, admin, or a guardian). */
  private Gift requireEditableGift(Long id) {
    User current = currentUser.require();
    Gift gift = giftRepository.findById(id)
      .orElseThrow(() -> new NotFoundException("Gift not found"));
    if (!guardianService.canManageList(current, gift.getOwner())) {
      throw new ForbiddenException("Only the owner, an admin, or a parent can change this gift");
    }
    return gift;
  }

  private void applyFields(Gift gift, GiftRequest req) {
    if (req.link() != null) gift.setLink(req.link());
    if (req.price() != null) {
      if (req.price().length() > 255) throw new IllegalArgumentException("Price must be 255 characters or fewer");
      gift.setPrice(req.price());
    }
    if (req.description() != null) gift.setDescription(req.description());
    if (req.exactColor() != null) gift.setExactColor(req.exactColor());
    if (req.exactProduct() != null) gift.setExactProduct(req.exactProduct());
    if (req.onlyOnce() != null) gift.setOnlyOnce(req.onlyOnce());
    if (req.type() != null) gift.setType(req.type());
  }

  public record GiftRequest(Long ownerId, String title, String link, String price,
                            String description, Boolean exactColor, Boolean exactProduct,
                            Boolean onlyOnce, GiftType type) {}

  public record ReceivedRequest(Boolean received) {}

  public record PriorityRequest(String direction) {}
}
