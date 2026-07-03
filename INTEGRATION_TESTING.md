# Integration Testing with Testcontainers

This document describes the integration testing setup for Giftpile backend using Testcontainers with PostgreSQL.

## Overview

Integration tests in Giftpile use:
- **Testcontainers**: Runs PostgreSQL in a Docker container for each test class
- **Flyway**: Automatically applies database migrations at test startup
- **Spring Boot Test**: Integrates with Spring context for full application testing
- **JUnit 5**: Test framework with Jupiter API

## Architecture

### IntegrationTestBase Class

`IntegrationTestBase` is the foundation for all integration tests:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("integrationtest")
public abstract class IntegrationTestBase {
  
  @Container
  static final PostgreSQLContainer<?> postgresContainer = 
    new PostgreSQLContainer<>("postgres:17-alpine")
      .withDatabaseName("giftpile_test")
      .withUsername("test_user")
      .withPassword("test_password")
      .withInitScript("postgres-init.sql");

  @DynamicPropertySource
  static void configureDatabase(DynamicPropertyRegistry registry) {
    // Dynamically set datasource properties from container
  }
}
```

**Key Features:**
- Container is shared across all test methods in a class
- Flyway migrations run automatically on startup
- `@ActiveProfiles("integrationtest")` loads test-specific configuration
- `@DynamicPropertySource` injects container connection details into Spring

### Test Configuration Profile

File: `src/test/resources/application-integrationtest.properties`

```properties
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=none

# Flyway Configuration
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration,classpath:db/migration/postgres
spring.flyway.baseline-on-migrate=true
```

**Settings:**
- `ddl-auto=none`: Disables Hibernate auto-schema generation (Flyway handles it)
- `flyway.enabled=true`: Activates Flyway migrations
- `flyway.locations`: Includes both common and PostgreSQL-specific migrations

### Database Migrations

Migrations are organized as follows:

```
src/main/resources/db/migration/
├── V1__init.sql                    # Common schema (all databases)
└── postgres/
    └── V1__init_postgres.sql       # PostgreSQL-specific enhancements
```

**V1__init.sql** (Common):
- Uses database-agnostic SQL (SERIAL, VARCHAR, etc.)
- Creates users, gifts, and claims tables
- Compatible with H2, SQLite, and PostgreSQL

**V1__init_postgres.sql** (PostgreSQL-specific):
- Adds PostgreSQL-native features like TIMESTAMP WITH TIME ZONE
- Uses `DO` blocks for conditional logic
- Idempotent (safe to run multiple times)

## Writing Integration Tests

### Basic Template

```java
public class MyIntegrationTest extends IntegrationTestBase {

  @Autowired
  private MyService myService;

  @Autowired
  private MyRepository myRepository;

  @BeforeEach
  public void setup() {
    // Clean up test data
    myRepository.deleteAll();
    // Create test fixtures
  }

  @Test
  public void testFeature() {
    // Arrange
    MyEntity entity = new MyEntity(...);
    entity = myRepository.save(entity);

    // Act
    MyResult result = myService.doSomething(entity);

    // Assert
    assertThat(result).isNotNull();
    assertThat(myRepository.findAll()).hasSize(1);
  }
}
```

### Web Layer (Controller) Tests

Use `MockMvc` for HTTP endpoint testing:

```java
public class UserControllerTest extends IntegrationTestBase {

  @Autowired
  private WebApplicationContext webApplicationContext;

  @Autowired
  private UserRepository userRepository;

  private MockMvc mockMvc;

  @BeforeEach
  public void setup() {
    mockMvc = MockMvcBuilders
      .webAppContextSetup(webApplicationContext)
      .build();
    userRepository.deleteAll();
  }

  @Test
  public void testGetUser() throws Exception {
    User user = new User("testuser", "password", "#FF5733");
    user = userRepository.save(user);

    mockMvc.perform(get("/api/users/" + user.getId()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.name").value("testuser"));
  }
}
```

### Service Layer Tests

Test business logic with database access:

```java
public class UserServiceTest extends IntegrationTestBase {

  @Autowired
  private UserService userService;

  @Autowired
  private UserRepository userRepository;

  @Test
  public void testCreateUser() {
    User user = userService.createUser("newuser", "password123", "#FF5733");

    assertThat(user.getId()).isNotNull();
    assertThat(userRepository.findById(user.getId())).isPresent();
  }
}
```

## Running Tests

### Run All Integration Tests

```bash
cd backend
mvn test
```

### Run Specific Test Class

```bash
mvn test -Dtest=AuthControllerTest
```

### Run Specific Test Method

```bash
mvn test -Dtest=AuthControllerTest#testLoginSuccess
```

### Run Tests with Debug Logging

```bash
mvn test -Dorg.slf4j.simpleLogger.defaultLogLevel=debug
```

### Run Tests in IDE

Most IDEs (IntelliJ, Eclipse, VS Code with Java extensions) support running individual tests or test classes:
- Right-click test class → "Run" or "Debug"
- Tests will automatically start the PostgreSQL container

## Performance Considerations

### Container Lifecycle

- **Shared across test class**: The PostgreSQL container starts once per test class
- **Isolated data per test**: Each test method's changes are rolled back
- **Fastest for multiple tests**: Class-level container is more efficient than per-method

**Example timing:**
- Container startup: ~5-10 seconds (first test in class)
- Flyway migrations: ~1 second
- Individual test: <1 second (if no I/O)

### Optimization Tips

1. **Batch assertions** when possible:
   ```java
   // Good: Single assertion with multiple checks
   assertThat(user)
     .hasFieldOrPropertyWithValue("name", "testuser")
     .hasFieldOrPropertyWithValue("isAdmin", false);
   
   // Less efficient: Multiple separate assertions
   assertThat(user.getName()).isEqualTo("testuser");
   assertThat(user.getIsAdmin()).isFalse();
   ```

2. **Clean up efficiently**:
   ```java
   // Good: Delete all at once
   userRepository.deleteAll();
   
   // Less efficient: Delete one by one
   for (User user : userRepository.findAll()) {
     userRepository.delete(user);
   }
   ```

3. **Reuse container across related tests**: Group related tests in the same class

## Troubleshooting

### Container Won't Start

**Error:** `Could not find a valid Docker daemon`

**Solution:** Ensure Docker is running:
```bash
docker ps
```

If Docker is not installed, install Docker Desktop or Docker Engine.

### Migrations Fail

**Error:** `Migration validation failed`

**Solution:** Check migration file names:
- Must follow pattern: `V{number}__{description}.sql`
- `V1__init.sql` ✓
- `V2__add_column.sql` ✓
- `v1__init.sql` ✗ (lowercase)

### Tests Pass Locally but Fail in CI

**Cause:** Different database state or timezone

**Solution:**
1. Run tests with `--info` flag to see SQL
2. Check `postgres-init.sql` for timezone/locale settings
3. Ensure migrations are idempotent with `IF EXISTS`

### Port Already in Use

**Error:** `Address already in use`

**Solution:** Stop other containers:
```bash
docker ps
docker stop <container-id>
```

## Common Test Patterns

### Testing Transaction Isolation

```java
@Test
public void testTransactionRollback() {
  User user = new User("testuser", "password", "#FF5733");
  userRepository.save(user);

  // Changes are isolated to this test
  assertThat(userRepository.findAll()).hasSize(1);
}

@Test
public void testDataCleanup() {
  // Previous test's data is cleaned up (we use deleteAll in @BeforeEach)
  assertThat(userRepository.findAll()).isEmpty();
}
```

### Testing Database Constraints

```java
@Test
public void testUniqueConstraintOnUsername() {
  User user1 = new User("duplicate", "password", "#FF5733");
  userRepository.save(user1);

  User user2 = new User("duplicate", "password", "#00FF00");
  assertThatThrownBy(() -> userRepository.save(user2))
    .isInstanceOf(DataIntegrityViolationException.class);
}
```

### Testing Cascading Operations

```java
@Test
public void testDeleteUserCascadesGifts() {
  User user = new User("testuser", "password", "#FF5733");
  user = userRepository.save(user);

  Gift gift = new Gift(user, "Test Gift", 0);
  gift = giftRepository.save(gift);

  userRepository.delete(user);

  assertThat(giftRepository.findById(gift.getId())).isEmpty();
}
```

## CI/CD Integration

For GitHub Actions or similar CI systems:

```yaml
- name: Run Integration Tests
  run: mvn test
```

Ensure:
1. Docker is available in CI environment
2. Java 25 is installed
3. Maven 3.9+ is installed

Most modern CI systems have Docker pre-installed.

## Related Files

- `src/test/java/com/giftpile/IntegrationTestBase.java` - Base class
- `src/test/resources/application-integrationtest.properties` - Test configuration
- `src/test/resources/postgres-init.sql` - PostgreSQL container initialization
- `src/main/resources/db/migration/V1__init.sql` - Common migrations
- `src/main/resources/db/migration/postgres/V1__init_postgres.sql` - PostgreSQL-specific
- `backend/pom.xml` - Testcontainers dependencies

## References

- [Testcontainers Documentation](https://testcontainers.com/)
- [Testcontainers PostgreSQL Module](https://testcontainers.com/modules/postgresql/)
- [Flyway Documentation](https://flywaydb.org/)
- [Spring Boot Testing](https://spring.io/guides/gs/testing-web/)
