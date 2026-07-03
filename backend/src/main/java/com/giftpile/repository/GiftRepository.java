package com.giftpile.repository;

import com.giftpile.entity.Gift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Spring Data JPA repository for Gift entity.
 * Provides CRUD operations and custom query methods for gift management.
 */
@Repository
public interface GiftRepository extends JpaRepository<Gift, Long> {
  /**
   * Find all gifts owned by a specific user.
   *
   * @param ownerId the ID of the gift owner
   * @return list of gifts owned by the user
   */
  List<Gift> findByOwnerId(Long ownerId);

  /**
   * Find all gifts owned by a specific user, ordered by manual received status
   * and priority (ascending).
   *
   * @param ownerId the ID of the gift owner
   * @return ordered list of gifts
   */
  @Query("SELECT g FROM Gift g WHERE g.owner.id = ?1 ORDER BY g.manualReceived ASC, g.priority ASC")
  List<Gift> findByOwnerIdOrderByStatus(Long ownerId);
}
