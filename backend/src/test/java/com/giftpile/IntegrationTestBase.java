package com.giftpile;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for Spring Boot integration tests with PostgreSQL Testcontainer.
 *
 * This class sets up a PostgreSQL container for testing and automatically configures
 * Spring to connect to it. Flyway migrations are executed against the container.
 *
 * Usage:
 * <pre>{@code
 * @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
 * @Testcontainers
 * public class MyIntegrationTest extends IntegrationTestBase {
 *   // Your test methods here
 * }
 * }</pre>
 *
 * The test profile "integrationtest" is active, allowing test-specific bean configuration.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("integrationtest")
public abstract class IntegrationTestBase {

  /**
   * PostgreSQL container managed by Testcontainers.
   * Automatically started and stopped for each test class.
   */
  @Container
  static final PostgreSQLContainer<?> postgresContainer =
      new PostgreSQLContainer<>("postgres:17-alpine")
          .withDatabaseName("giftpile_test")
          .withUsername("test_user")
          .withPassword("test_password")
          .withInitScript("postgres-init.sql");

  /**
   * Dynamically register database properties from the container.
   * This method is called by Spring Test to configure the datasource URL,
   * username, and password before the application context is loaded.
   *
   * @param registry Spring's dynamic property registry
   */
  @DynamicPropertySource
  static void configureDatabase(DynamicPropertyRegistry registry) {
    registry.add(
        "spring.datasource.url",
        postgresContainer::getJdbcUrl
    );
    registry.add(
        "spring.datasource.username",
        postgresContainer::getUsername
    );
    registry.add(
        "spring.datasource.password",
        postgresContainer::getPassword
    );
  }
}
