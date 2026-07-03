# Integration Testing Quick Start

## TL;DR

All integration tests now use PostgreSQL Testcontainers automatically. Just extend `IntegrationTestBase`.

## Create a New Integration Test

```java
import com.giftpile.IntegrationTestBase;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.Test;

public class MyIntegrationTest extends IntegrationTestBase {

  @Autowired
  private MyRepository myRepository;

  @Test
  public void testFeature() {
    // Test code here
    // Database is automatically available
    // Flyway migrations already ran
  }
}
```

## Run Tests

```bash
# All tests
mvn test

# Specific test class
mvn test -Dtest=MyIntegrationTest

# Specific test method
mvn test -Dtest=MyIntegrationTest#testFeature
```

## Requirements

- Docker installed and running
- Java 25
- Maven 3.9+

## What Happens Automatically

1. PostgreSQL 17 Alpine container starts
2. Flyway migrations run (V1__init.sql + V1__init_postgres.sql)
3. Test context loads with Spring beans
4. Each test method gets clean database
5. Container stops after all tests complete

## Common Patterns

### Controller Test (HTTP endpoints)
```java
@Autowired
private WebApplicationContext webApplicationContext;

private MockMvc mockMvc;

@BeforeEach
public void setup() {
  mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
  userRepository.deleteAll(); // Clean data
}

@Test
public void testEndpoint() throws Exception {
  mockMvc.perform(get("/api/users"))
    .andExpect(status().isOk());
}
```

### Service Test (Business logic)
```java
@Autowired
private MyService myService;
@Autowired
private MyRepository myRepository;

@BeforeEach
public void setup() {
  myRepository.deleteAll();
}

@Test
public void testLogic() {
  MyEntity entity = myService.createEntity("data");
  assertThat(entity.getId()).isNotNull();
}
```

### Repository Test (Data access)
```java
@Autowired
private MyRepository myRepository;

@Test
public void testQuery() {
  MyEntity entity = new MyEntity("name");
  myRepository.save(entity);
  
  MyEntity retrieved = myRepository.findByName("name").orElseThrow();
  assertThat(retrieved.getName()).isEqualTo("name");
}
```

## Troubleshooting

### Docker not found
```bash
# Ensure Docker is running
docker ps

# Install Docker if needed
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Linux: https://docs.docker.com/engine/install/
```

### Tests fail with "Cannot connect to database"
- Check Docker is running: `docker ps`
- Try stopping other containers: `docker stop $(docker ps -aq)`
- Rebuild: `mvn clean test`

### Tests are slow
- First test class takes 5-10s (container startup + migrations)
- Subsequent tests are <1s each
- Multiple test classes in same file = container reused
- This is normal and expected

## Key Files

- `src/test/java/com/giftpile/IntegrationTestBase.java` - Base class
- `src/test/resources/application-integrationtest.properties` - Test config
- `src/main/resources/db/migration/V1__init.sql` - Schema
- `INTEGRATION_TESTING.md` - Full documentation

## IDE Integration

### IntelliJ IDEA
- Right-click test class or method
- Select "Run" or "Debug"
- Container starts automatically

### VS Code (with Java Extension)
- Click "Run" above test method
- Container starts automatically

### Eclipse
- Right-click test class
- Run As → JUnit Test
- Container starts automatically

## Tips

1. **Keep tests isolated**: Each test should clean up after itself
   ```java
   @BeforeEach
   public void setup() {
     repository.deleteAll(); // Clean state
   }
   ```

2. **Use realistic data**: Test with actual business scenarios
   ```java
   User user = new User("alice", encodedPassword, "#FF5733");
   user.setIsAdmin(false);
   user = userRepository.save(user);
   ```

3. **Group related tests**: Fewer test classes = faster overall (shared container)

4. **Test both happy and sad paths**:
   ```java
   @Test
   public void testSuccess() { /* ... */ }
   
   @Test
   public void testErrorHandling() { /* ... */ }
   ```

## Advanced

See `INTEGRATION_TESTING.md` for:
- Performance optimization
- Custom database setup
- Migration best practices
- CI/CD integration
- Advanced troubleshooting
