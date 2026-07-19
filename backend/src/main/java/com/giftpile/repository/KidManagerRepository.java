package com.giftpile.repository;

import com.giftpile.entity.KidManager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/** Parent/manager assignments for kid users. */
@Repository
public interface KidManagerRepository extends JpaRepository<KidManager, KidManager.Key> {
  List<KidManager> findByKidUserId(Long kidUserId);

  List<KidManager> findByManagerUserId(Long managerUserId);

  boolean existsByKidUserIdAndManagerUserId(Long kidUserId, Long managerUserId);

  void deleteByKidUserId(Long kidUserId);

  void deleteByManagerUserId(Long managerUserId);
}
