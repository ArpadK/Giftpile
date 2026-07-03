package com.giftpile.controller;

import com.giftpile.entity.User;
import com.giftpile.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for AuthController endpoints.
 * Tests authentication flow: login, session creation, and user retrieval.
 *
 * Test cases:
 * - GET /api/users unauthenticated: returns user list with id, name, color
 * - POST /api/auth/login with valid credentials: returns 200 with user data
 * - POST /api/auth/login with invalid credentials: returns 401
 * - GET /api/auth/me with valid session: returns current user data
 * - GET /api/auth/me without session: returns 401
 *
 * Uses H2 in-memory database for lightweight testing without Docker.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"spring.config.location=classpath:application-test.properties"})
public class AuthControllerTest {

  @Autowired
  private WebApplicationContext webApplicationContext;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private com.giftpile.repository.GiftRepository giftRepository;

  @Autowired
  private com.giftpile.repository.ClaimRepository claimRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  private MockMvc mockMvc;
  private User testUser;
  private User secondUser;

  @BeforeEach
  public void setup() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    // Delete dependents before users: this context/in-memory DB is shared with other test
    // classes, so residual gifts/claims would otherwise trip the users FK on deleteAll().
    claimRepository.deleteAll();
    giftRepository.deleteAll();
    userRepository.deleteAll();
    testUser = new User("testuser", passwordEncoder.encode("password123"), "#FF5733");
    testUser.setIsAdmin(false);
    testUser = userRepository.save(testUser);

    secondUser = new User("anotheruser", passwordEncoder.encode("anotherpass"), "#00FF00");
    secondUser.setIsAdmin(false);
    secondUser = userRepository.save(secondUser);
  }

  /**
   * Test that GET /api/users returns all users without authentication.
   * Response should include id, name, and color for each user.
   */
  @Test
  public void testGetAllUsersUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/users"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(2)))
      .andExpect(jsonPath("$[0].id", notNullValue()))
      .andExpect(jsonPath("$[0].name", notNullValue()))
      .andExpect(jsonPath("$[0].color", notNullValue()))
      .andExpect(jsonPath("$[*].name", containsInAnyOrder("testuser", "anotheruser")))
      .andExpect(jsonPath("$[*].color", containsInAnyOrder("#FF5733", "#00FF00")));
  }

  /**
   * Test POST /api/auth/login with correct credentials.
   * Should return 200 with user data (id, name, color, isAdmin).
   */
  @Test
  public void testLoginSuccess() throws Exception {
    mockMvc.perform(post("/api/auth/login")
        .contentType("application/json")
        .content("{\"userId\":" + testUser.getId() + ",\"password\":\"password123\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id").value(testUser.getId().intValue()))
      .andExpect(jsonPath("$.name").value("testuser"))
      .andExpect(jsonPath("$.color").value("#FF5733"))
      .andExpect(jsonPath("$.isAdmin").value(false));
  }

  /**
   * Test POST /api/auth/login with invalid user ID.
   * Should return 401 with error message.
   */
  @Test
  public void testLoginInvalidUser() throws Exception {
    mockMvc.perform(post("/api/auth/login")
        .contentType("application/json")
        .content("{\"userId\":999,\"password\":\"password123\"}"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.message").value("Invalid credentials"));
  }

  /**
   * Test POST /api/auth/login with incorrect password.
   * Should return 401 with error message.
   */
  @Test
  public void testLoginInvalidPassword() throws Exception {
    mockMvc.perform(post("/api/auth/login")
        .contentType("application/json")
        .content("{\"userId\":" + testUser.getId() + ",\"password\":\"wrongpassword\"}"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.message").value("Invalid credentials"));
  }

  /**
   * Test GET /api/auth/me with authenticated user.
   * Uses @WithMockUser to simulate an authenticated session.
   * Should return 200 with current user data.
   */
  @Test
  @WithMockUser(username = "testuser")
  public void testGetCurrentUserAuthenticated() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id").value(testUser.getId().intValue()))
      .andExpect(jsonPath("$.name").value("testuser"))
      .andExpect(jsonPath("$.color").value("#FF5733"))
      .andExpect(jsonPath("$.isAdmin").value(false));
  }

  /**
   * Test GET /api/auth/me without authentication.
   * Should return 401 (Unauthorized).
   */
  @Test
  public void testGetCurrentUserUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
      .andExpect(status().isUnauthorized());
  }

  /**
   * Test GET /api/auth/me for different authenticated users.
   * Verifies that authenticated context returns the correct user.
   */
  @Test
  @WithMockUser(username = "anotheruser")
  public void testGetCurrentUserDifferentUser() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id").value(secondUser.getId().intValue()))
      .andExpect(jsonPath("$.name").value("anotheruser"))
      .andExpect(jsonPath("$.color").value("#00FF00"));
  }

  /**
   * Test that login response includes all required user fields.
   */
  @Test
  public void testLoginResponseIncludesAllFields() throws Exception {
    mockMvc.perform(post("/api/auth/login")
        .contentType("application/json")
        .content("{\"userId\":" + testUser.getId() + ",\"password\":\"password123\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id").exists())
      .andExpect(jsonPath("$.name").exists())
      .andExpect(jsonPath("$.color").exists())
      .andExpect(jsonPath("$.isAdmin").exists());
  }

  /**
   * Test GET /api/auth/me response includes all required user fields.
   */
  @Test
  @WithMockUser(username = "testuser")
  public void testGetMeResponseIncludesAllFields() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id").exists())
      .andExpect(jsonPath("$.name").exists())
      .andExpect(jsonPath("$.color").exists())
      .andExpect(jsonPath("$.isAdmin").exists());
  }
}
