package com.giftpile.repository;

import com.giftpile.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Spring Data JPA repository for User entity.
 * Provides CRUD operations and custom query methods for user management.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
  /**
   * Find a user by their unique name.
   *
   * @param name the user's name
   * @return Optional containing the user if found
   */
  Optional<User> findByName(String name);
}
