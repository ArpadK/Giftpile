package com.giftpile.service;

import com.giftpile.entity.User;
import com.giftpile.exception.NotFoundException;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.KidManagerRepository;
import com.giftpile.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
public class AdminService {

  private final UserRepository userRepository;
  private final GiftRepository giftRepository;
  private final ClaimRepository claimRepository;
  private final KidManagerRepository kidManagerRepository;

  public AdminService(UserRepository userRepository, GiftRepository giftRepository,
                      ClaimRepository claimRepository, KidManagerRepository kidManagerRepository) {
    this.userRepository = userRepository;
    this.giftRepository = giftRepository;
    this.claimRepository = claimRepository;
    this.kidManagerRepository = kidManagerRepository;
  }

  /**
   * Validates whether a user can be deleted.
   *
   * Guardrails:
   * 1. Cannot delete the last admin
   * 2. Cannot self-delete (though this should be checked at controller level)
   *
   * @param userId the ID of the user to delete
   * @param currentUserId the ID of the user performing the deletion
   * @return Optional.empty() if deletion is allowed, or Optional with error message if not
   */
  public Optional<String> validateDeletion(Long userId, Long currentUserId) {
    User user = userRepository.findById(userId)
      .orElse(null);

    if (user == null) {
      return Optional.of("User not found");
    }

    // Guardrail 1: Cannot self-delete
    if (userId.equals(currentUserId)) {
      return Optional.of("Cannot delete your own account");
    }

    // Guardrail 2: Cannot delete the last admin
    if (user.getIsAdmin() && userRepository.countByIsAdminTrue() == 1) {
      return Optional.of("Cannot delete the last admin");
    }

    return Optional.empty();
  }

  /**
   * Deletes a user and cascades deletion of their gifts and claims made by them.
   *
   * This method assumes validation has been performed via validateDeletion().
   *
   * @param userId the ID of the user to delete
   */
  @Transactional
  public void deleteUser(Long userId) {
    User user = userRepository.findById(userId)
      .orElseThrow(() -> new NotFoundException("User not found"));

    // Cascade delete gifts and claims
    giftRepository.findByOwnerId(user.getId()).forEach(gift -> {
      claimRepository.findByGiftId(gift.getId()).forEach(claimRepository::delete);
      giftRepository.delete(gift);
    });

    // Delete claims made by this user
    claimRepository.deleteByClaimerUserId(user.getId());

    // Remove any parent/kid links on either side.
    kidManagerRepository.deleteByKidUserId(user.getId());
    kidManagerRepository.deleteByManagerUserId(user.getId());

    userRepository.delete(user);
  }

  /** Number of users with the admin role. */
  public long getAdminCount() {
    return userRepository.countByIsAdminTrue();
  }
}
