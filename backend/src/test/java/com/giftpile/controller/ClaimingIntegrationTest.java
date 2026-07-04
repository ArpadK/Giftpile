package com.giftpile.controller;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for gift claiming functionality.
 * Tests cover:
 * - Non-repeatable gifts: first claim succeeds, second claim by different user returns 409
 * - Visibility: claimed gifts disappear from other viewers until effectiveReceived
 * - Unclaiming: claiming another time restores visibility
 * - Repeatable gifts: multiple claims allowed
 * - Effective received date: gifts show when past claim date
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"spring.config.location=classpath:application-test.properties"})
public class ClaimingIntegrationTest {

  @Autowired
  private WebApplicationContext webApplicationContext;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private GiftRepository giftRepository;

  @Autowired
  private ClaimRepository claimRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  private MockMvc mockMvc;
  private User alice;
  private User bob;
  private User charlie;
  private Gift nonRepeatableGift;
  private Gift repeatableGift;

  @BeforeEach
  public void setup() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

    // Clean up
    claimRepository.deleteAll();
    giftRepository.deleteAll();
    userRepository.deleteAll();

    // Create test users
    alice = new User("alice", passwordEncoder.encode("password123"), "#FF5733");
    alice.setIsAdmin(false);
    alice = userRepository.save(alice);

    bob = new User("bob", passwordEncoder.encode("password123"), "#4C5FE8");
    bob.setIsAdmin(false);
    bob = userRepository.save(bob);

    charlie = new User("charlie", passwordEncoder.encode("password123"), "#FFD700");
    charlie.setIsAdmin(false);
    charlie = userRepository.save(charlie);

    // Create gifts owned by Alice
    // Non-repeatable gift
    nonRepeatableGift = new Gift(alice, "Non-Repeatable Gift", 0);
    nonRepeatableGift.setOnlyOnce(true);
    nonRepeatableGift = giftRepository.save(nonRepeatableGift);

    // Repeatable gift
    repeatableGift = new Gift(alice, "Repeatable Gift", 1);
    repeatableGift.setOnlyOnce(false);
    repeatableGift = giftRepository.save(repeatableGift);
  }

  private void setCurrentUser(User user) {
    List<GrantedAuthority> authorities = new ArrayList<>();
    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
      user.getName(), null, authorities);
    SecurityContextHolder.getContext().setAuthentication(auth);
  }

  /**
   * Test that a non-repeatable gift can be claimed once by any user.
   */
  @Test
  public void testClaimNonRepeatableGift() throws Exception {
    // Bob claims the non-repeatable gift
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + LocalDate.now() + "\"}"))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.claimed").value(true));

    // Verify claim was created
    Claim claim = claimRepository.findByClaimerUserIdAndGiftId(bob.getId(), nonRepeatableGift.getId())
      .orElseThrow(() -> new AssertionError("Claim not found"));
    assert claim.getClaimerUser().getId().equals(bob.getId());
    assert claim.getGiftDate().equals(LocalDate.now());
  }

  /**
   * Test that a non-repeatable gift claimed by one user cannot be claimed by another user (409 Conflict).
   */
  @Test
  public void testSecondClaimNonRepeatableGiftReturns409() throws Exception {
    // Bob claims the non-repeatable gift
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + LocalDate.now() + "\"}"))
      .andExpect(status().isCreated());

    // Charlie tries to claim the same non-repeatable gift
    setCurrentUser(charlie);
    mockMvc.perform(post("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + LocalDate.now() + "\"}"))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value("Gift already claimed by another user"));

    // Verify only Bob's claim exists
    assert claimRepository.findByGiftId(nonRepeatableGift.getId()).size() == 1;
  }

  /**
   * Test that a claimed non-repeatable gift is hidden from other viewers until effectiveReceived.
   * The gift should:
   * - Be visible to the claimer (Bob)
   * - Be hidden from other viewers (Charlie) until the claim date has passed
   */
  @Test
  public void testClaimedNonRepeatableGiftDisappearsFromOtherViewers() throws Exception {
    LocalDate tomorrow = LocalDate.now().plusDays(1);

    // Bob claims the non-repeatable gift for tomorrow
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + tomorrow + "\"}"))
      .andExpect(status().isCreated());

    // Bob should see the gift (he's the claimer)
    mockMvc.perform(get("/api/users/" + alice.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].id").value(nonRepeatableGift.getId().intValue()))
      .andExpect(jsonPath("$[0].claim.claimerUserId").value(bob.getId().intValue()));

    // Charlie should NOT see the gift (it's claimed by Bob and not yet received)
    setCurrentUser(charlie);
    mockMvc.perform(get("/api/users/" + alice.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(1)); // Only the repeatable gift
  }

  /**
   * Test that unclaiming and reclaiming restores visibility to other viewers.
   * Flow:
   * 1. Bob claims the gift
   * 2. Charlie cannot see it
   * 3. Bob unclaims
   * 4. Charlie can see it again
   */
  @Test
  public void testUnclaimRestoresVisibilityToOtherViewers() throws Exception {
    LocalDate tomorrow = LocalDate.now().plusDays(1);

    // Bob claims the non-repeatable gift
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + tomorrow + "\"}"))
      .andExpect(status().isCreated());

    // Verify Charlie cannot see the gift
    setCurrentUser(charlie);
    mockMvc.perform(get("/api/users/" + alice.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(1)); // Only repeatable gift

    // Bob unclaims the gift
    setCurrentUser(bob);
    mockMvc.perform(delete("/api/gifts/" + nonRepeatableGift.getId() + "/claim"))
      .andExpect(status().isOk());

    // Verify Charlie can now see the gift again
    setCurrentUser(charlie);
    mockMvc.perform(get("/api/users/" + alice.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(2)) // Both gifts visible
      .andExpect(jsonPath("$[0].id").value(nonRepeatableGift.getId().intValue()))
      .andExpect(jsonPath("$[0].claim").doesNotExist()); // No claim visible to Charlie
  }

  /**
   * Test that a repeatable gift can be claimed by multiple users.
   */
  @Test
  public void testRepeatableGiftAcceptsMultipleClaims() throws Exception {
    LocalDate today = LocalDate.now();

    // Bob claims the repeatable gift
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + repeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + today + "\"}"))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.claimed").value(true));

    // Charlie also claims the repeatable gift
    setCurrentUser(charlie);
    mockMvc.perform(post("/api/gifts/" + repeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + today + "\"}"))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.claimed").value(true));

    // Verify both claims exist
    assert claimRepository.findByGiftId(repeatableGift.getId()).size() == 2;
    assert claimRepository.findByClaimerUserIdAndGiftId(bob.getId(), repeatableGift.getId()).isPresent();
    assert claimRepository.findByClaimerUserIdAndGiftId(charlie.getId(), repeatableGift.getId()).isPresent();
  }

  /**
   * Test that effectiveReceived is true when the current date is after the claim date.
   * When the viewer is the claimer and the claim date is in the past, effectiveReceived should be true.
   */
  @Test
  public void testEffectiveReceivedWhenPastClaimDate() throws Exception {
    LocalDate yesterday = LocalDate.now().minusDays(1);

    // Bob claims the non-repeatable gift for yesterday
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + yesterday + "\"}"))
      .andExpect(status().isCreated());

    // Bob views his claim - effectiveReceived should be true because today > claim date
    mockMvc.perform(get("/api/users/" + alice.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(2)) // Both gifts visible
      .andExpect(jsonPath("$[0].id").value(nonRepeatableGift.getId().intValue()))
      .andExpect(jsonPath("$[0].effectiveReceived").value(true));
  }

  /**
   * Test that repeatable gifts are always visible, but only show the viewer's own claim.
   */
  @Test
  public void testRepeatableGiftAlwaysVisibleButHidesOtherClaims() throws Exception {
    LocalDate today = LocalDate.now();

    // Bob claims the repeatable gift
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + repeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + today + "\"}"))
      .andExpect(status().isCreated());

    // Charlie claims the same repeatable gift
    setCurrentUser(charlie);
    mockMvc.perform(post("/api/gifts/" + repeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + today + "\"}"))
      .andExpect(status().isCreated());

    // When Charlie views Alice's gifts, the repeatable gift is visible and shows Charlie's claim
    mockMvc.perform(get("/api/users/" + alice.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[1].id").value(repeatableGift.getId().intValue()))
      .andExpect(jsonPath("$[1].claim.claimerUserId").value(charlie.getId().intValue()));

    // When Bob views Alice's gifts, the repeatable gift is visible and shows Bob's claim
    setCurrentUser(bob);
    mockMvc.perform(get("/api/users/" + alice.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[1].id").value(repeatableGift.getId().intValue()))
      .andExpect(jsonPath("$[1].claim.claimerUserId").value(bob.getId().intValue()));
  }

  /**
   * Test that the same user can claim a non-repeatable gift twice with different dates.
   */
  @Test
  public void testSameUserCanUpdateClaimDateOnNonRepeatableGift() throws Exception {
    LocalDate today = LocalDate.now();
    LocalDate tomorrow = LocalDate.now().plusDays(1);

    // Bob claims the non-repeatable gift for today
    setCurrentUser(bob);
    mockMvc.perform(post("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + today + "\"}"))
      .andExpect(status().isCreated());

    Claim claim = claimRepository.findByClaimerUserIdAndGiftId(bob.getId(), nonRepeatableGift.getId())
      .orElseThrow(() -> new AssertionError("Claim not found"));
    assert claim.getGiftDate().equals(today);

    // Bob updates the claim date to tomorrow
    mockMvc.perform(put("/api/gifts/" + nonRepeatableGift.getId() + "/claim")
        .contentType("application/json")
        .content("{\"giftDate\":\"" + tomorrow + "\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.updated").value(true));

    // Verify the claim date was updated
    claim = claimRepository.findByClaimerUserIdAndGiftId(bob.getId(), nonRepeatableGift.getId())
      .orElseThrow(() -> new AssertionError("Claim not found"));
    assert claim.getGiftDate().equals(tomorrow);
  }
}
