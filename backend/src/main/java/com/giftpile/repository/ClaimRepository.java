package com.giftpile.repository;

import com.giftpile.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for Claim entity.
 * Provides CRUD operations and custom query methods for claim management.
 */
@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {
  /**
   * Find all claims for a specific gift.
   *
   * @param giftId the ID of the gift
   * @return list of claims for the gift (empty if none found)
   */
  List<Claim> findByGiftId(Long giftId);

  /**
   * Find a claim by both claimer user ID and gift ID.
   *
   * @param claimerUserId the ID of the claiming user
   * @param giftId the ID of the gift
   * @return Optional containing the claim if found
   */
  Optional<Claim> findByClaimerUserIdAndGiftId(Long claimerUserId, Long giftId);

  /**
   * Delete all claims made by a specific user.
   *
   * @param claimerUserId the ID of the claiming user
   */
  void deleteByClaimerUserId(Long claimerUserId);
}
