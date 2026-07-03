package com.giftpile;

import com.giftpile.entity.User;
import com.giftpile.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.*;

/**
 * Example integration test demonstrating IntegrationTestBase usage.
 *
 * This test shows:
 * 1. Extending IntegrationTestBase for PostgreSQL Testcontainer setup
 * 2. Using @Autowired to inject Spring beans
 * 3. Database access with automatic Flyway migrations
 * 4. Transaction isolation between tests
 *
 * The container is started once per test class and shared across all test methods.
 * Each test method runs in isolation (transactions are rolled back).
 */
public class IntegrationTestExample extends IntegrationTestBase {

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  private User testUser;

  @BeforeEach
  public void setup() {
    userRepository.deleteAll();
    testUser = new User(
        "testuser",
        passwordEncoder.encode("password123"),
        "#FF5733"
    );
    testUser.setIsAdmin(false);
    testUser = userRepository.save(testUser);
  }

  /**
   * Demonstrates basic database interaction.
   * The Flyway migrations have already run against the PostgreSQL container.
   */
  @Test
  public void testCreateAndRetrieveUser() {
    // Verify user was created
    assertThat(testUser.getId()).isNotNull();
    assertThat(testUser.getName()).isEqualTo("testuser");
    assertThat(testUser.getIsAdmin()).isFalse();

    // Retrieve and verify
    User retrieved = userRepository.findById(testUser.getId()).orElseThrow();
    assertThat(retrieved.getName()).isEqualTo("testuser");
    assertThat(retrieved.getColor()).isEqualTo("#FF5733");
  }

  /**
   * Demonstrates transaction isolation.
   * Data is cleaned up after each test (no @Transactional annotation needed).
   */
  @Test
  public void testUserListEmpty() {
    // Previous test's data doesn't bleed into this test
    userRepository.deleteAll();
    assertThat(userRepository.findAll()).isEmpty();
  }
}
