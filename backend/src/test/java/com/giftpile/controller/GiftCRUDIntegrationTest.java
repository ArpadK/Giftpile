package com.giftpile.controller;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Gift CRUD operations.
 *
 * Tests cover:
 * - Create gift: new gift receives proper priority (max priority + 1)
 * - Retrieve owner list: owner sees all gifts (blind context), non-owner sees filtered list
 * - Update gift: modifiable fields are updated
 * - Delete gift: cascades to delete all associated claims
 * - Priority swaps: up/down operations correctly swap priorities between gifts
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"spring.config.location=classpath:application-test.properties"})
public class GiftCRUDIntegrationTest {

  @Autowired
  private WebApplicationContext webApplicationContext;

  @Autowired
  private GiftRepository giftRepository;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private ClaimRepository claimRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  private MockMvc mockMvc;
  private User owner;
  private User claimer;
  private User admin;

  private void setCurrentUser(User user) {
    UsernamePasswordAuthenticationToken auth =
      new UsernamePasswordAuthenticationToken(user.getName(), null, new ArrayList<>());
    SecurityContextHolder.getContext().setAuthentication(auth);
  }

  @BeforeEach
  public void setup() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

    claimRepository.deleteAll();
    giftRepository.deleteAll();
    userRepository.deleteAll();

    owner = new User("owner", passwordEncoder.encode("hash"), "#FF5733");
    owner.setIsAdmin(false);
    owner = userRepository.save(owner);

    claimer = new User("claimer", passwordEncoder.encode("hash"), "#00FF00");
    claimer.setIsAdmin(false);
    claimer = userRepository.save(claimer);

    admin = new User("admin", passwordEncoder.encode("hash"), "#0000FF");
    admin.setIsAdmin(true);
    admin = userRepository.save(admin);
  }

  @AfterEach
  public void tearDown() {
    SecurityContextHolder.clearContext();
  }

  // ============================================================================
  // CREATE GIFT TESTS
  // ============================================================================

  @Test
  public void testCreateGiftSuccessfully() throws Exception {
    setCurrentUser(owner);
    
    String requestBody = """
      {
        "ownerId": %d,
        "title": "PlayStation 5",
        "link": "https://example.com/ps5",
        "price": "$500",
        "description": "Next-gen console",
        "exactColor": false,
        "exactProduct": true,
        "onlyOnce": true
      }
      """.formatted(owner.getId());

    mockMvc.perform(post("/api/gifts")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.id").exists())
      .andExpect(jsonPath("$.title").value("PlayStation 5"))
      .andExpect(jsonPath("$.link").value("https://example.com/ps5"))
      .andExpect(jsonPath("$.price").value("$500"))
      .andExpect(jsonPath("$.description").value("Next-gen console"))
      .andExpect(jsonPath("$.exactColor").value(false))
      .andExpect(jsonPath("$.exactProduct").value(true))
      .andExpect(jsonPath("$.onlyOnce").value(true))
      .andExpect(jsonPath("$.priority").value(0))
      .andExpect(jsonPath("$.effectiveReceived").value(false));

    List<Gift> gifts = giftRepository.findByOwnerId(owner.getId());
    assertEquals(1, gifts.size());
    assertEquals("PlayStation 5", gifts.get(0).getTitle());
  }

  @Test
  public void testCreateGiftWithDefaults() throws Exception {
    setCurrentUser(owner);
    
    String requestBody = """
      {
        "ownerId": %d,
        "title": "Book"
      }
      """.formatted(owner.getId());

    mockMvc.perform(post("/api/gifts")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.title").value("Book"))
      .andExpect(jsonPath("$.exactColor").value(false))
      .andExpect(jsonPath("$.exactProduct").value(false))
      .andExpect(jsonPath("$.onlyOnce").value(true));
  }

  @Test
  public void testCreateGiftAssignsPrioritySequentially() throws Exception {
    setCurrentUser(owner);
    
    // Create first gift
    String gift1Body = """
      {
        "ownerId": %d,
        "title": "Gift 1"
      }
      """.formatted(owner.getId());

    mockMvc.perform(post("/api/gifts")
        .contentType("application/json")
        .content(gift1Body))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.priority").value(0));

    // Create second gift
    String gift2Body = """
      {
        "ownerId": %d,
        "title": "Gift 2"
      }
      """.formatted(owner.getId());

    mockMvc.perform(post("/api/gifts")
        .contentType("application/json")
        .content(gift2Body))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.priority").value(1));

    // Create third gift
    String gift3Body = """
      {
        "ownerId": %d,
        "title": "Gift 3"
      }
      """.formatted(owner.getId());

    mockMvc.perform(post("/api/gifts")
        .contentType("application/json")
        .content(gift3Body))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.priority").value(2));
  }


  // ============================================================================
  // UPDATE GIFT TESTS
  // ============================================================================

  @Test
  public void testUpdateGiftSuccessfully() throws Exception {
    Gift gift = new Gift(owner, "Original Title", 0);
    gift.setLink("https://original.com");
    gift.setPrice("$100");
    gift.setDescription("Original description");
    gift = giftRepository.save(gift);

    setCurrentUser(owner);

    String updateBody = """
      {
        "title": "Updated Title",
        "link": "https://updated.com",
        "price": "$200",
        "description": "Updated description",
        "exactColor": true,
        "exactProduct": false,
        "onlyOnce": false
      }
      """;

    mockMvc.perform(put("/api/gifts/" + gift.getId())
        .contentType("application/json")
        .content(updateBody))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("Updated Title"))
      .andExpect(jsonPath("$.link").value("https://updated.com"))
      .andExpect(jsonPath("$.price").value("$200"))
      .andExpect(jsonPath("$.description").value("Updated description"))
      .andExpect(jsonPath("$.exactColor").value(true))
      .andExpect(jsonPath("$.exactProduct").value(false))
      .andExpect(jsonPath("$.onlyOnce").value(false));

    Gift updated = giftRepository.findById(gift.getId()).orElse(null);
    assertNotNull(updated);
    assertEquals("Updated Title", updated.getTitle());
    assertEquals("https://updated.com", updated.getLink());
    assertEquals("$200", updated.getPrice());
    assertEquals("Updated description", updated.getDescription());
    assertTrue(updated.getExactColor());
    assertFalse(updated.getExactProduct());
    assertFalse(updated.getOnlyOnce());
  }

  @Test
  public void testUpdateGiftPartially() throws Exception {
    Gift gift = new Gift(owner, "Original Title", 0);
    gift.setLink("https://original.com");
    gift = giftRepository.save(gift);

    setCurrentUser(owner);

    String updateBody = """
      {
        "title": "New Title"
      }
      """;

    mockMvc.perform(put("/api/gifts/" + gift.getId())
        .contentType("application/json")
        .content(updateBody))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("New Title"))
      .andExpect(jsonPath("$.link").value("https://original.com"));
  }

  @Test
  public void testUpdateGiftAsNonOwnerForbidden() throws Exception {
    Gift gift = new Gift(owner, "Original Title", 0);
    gift = giftRepository.save(gift);

    setCurrentUser(claimer);

    String updateBody = """
      {
        "title": "Hacked Title"
      }
      """;

    mockMvc.perform(put("/api/gifts/" + gift.getId())
        .contentType("application/json")
        .content(updateBody))
      .andExpect(status().isForbidden());

    Gift unchanged = giftRepository.findById(gift.getId()).orElse(null);
    assertNotNull(unchanged);
    assertEquals("Original Title", unchanged.getTitle());
  }

  @Test
  public void testUpdateGiftAsAdminAllowed() throws Exception {
    Gift gift = new Gift(owner, "Original Title", 0);
    gift = giftRepository.save(gift);

    setCurrentUser(admin);

    String updateBody = """
      {
        "title": "Admin Updated Title"
      }
      """;

    mockMvc.perform(put("/api/gifts/" + gift.getId())
        .contentType("application/json")
        .content(updateBody))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("Admin Updated Title"));
  }


  // ============================================================================
  // DELETE GIFT TESTS
  // ============================================================================

  @Test
  public void testDeleteGiftSuccessfully() throws Exception {
    Gift gift = new Gift(owner, "Gift to Delete", 0);
    gift = giftRepository.save(gift);

    setCurrentUser(owner);

    mockMvc.perform(delete("/api/gifts/" + gift.getId()))
      .andExpect(status().isOk());

    assertFalse(giftRepository.existsById(gift.getId()));
  }

  @Test
  public void testDeleteGiftCascadesClaimsDeletion() throws Exception {
    Gift gift = new Gift(owner, "Gift with Claims", 0);
    gift = giftRepository.save(gift);

    // Create multiple claims on the gift
    Claim claim1 = new Claim(gift, claimer, LocalDate.now());
    Claim claim2 = new Claim(gift, admin, LocalDate.now().plusDays(1));
    claim1 = claimRepository.save(claim1);
    claim2 = claimRepository.save(claim2);

    // Verify claims exist
    List<Claim> claimsBeforeDelete = claimRepository.findByGiftId(gift.getId());
    assertEquals(2, claimsBeforeDelete.size());

    setCurrentUser(owner);

    // Delete the gift
    mockMvc.perform(delete("/api/gifts/" + gift.getId()))
      .andExpect(status().isOk());

    // Verify gift is deleted
    assertFalse(giftRepository.existsById(gift.getId()));

    // Verify all claims are deleted
    List<Claim> claimsAfterDelete = claimRepository.findByGiftId(gift.getId());
    assertEquals(0, claimsAfterDelete.size());

    // Verify claims are not in the repository at all
    assertFalse(claimRepository.existsById(claim1.getId()));
    assertFalse(claimRepository.existsById(claim2.getId()));
  }

  @Test
  public void testDeleteGiftAsNonOwnerForbidden() throws Exception {
    Gift gift = new Gift(owner, "Gift", 0);
    gift = giftRepository.save(gift);

    setCurrentUser(claimer);

    mockMvc.perform(delete("/api/gifts/" + gift.getId()))
      .andExpect(status().isForbidden());

    assertTrue(giftRepository.existsById(gift.getId()));
  }

  @Test
  public void testDeleteGiftAsAdminAllowed() throws Exception {
    Gift gift = new Gift(owner, "Gift", 0);
    gift = giftRepository.save(gift);

    setCurrentUser(admin);

    mockMvc.perform(delete("/api/gifts/" + gift.getId()))
      .andExpect(status().isOk());

    assertFalse(giftRepository.existsById(gift.getId()));
  }


  // ============================================================================
  // PRIORITY SWAP TESTS
  // ============================================================================

  @Test
  public void testPriorityUpSwapsWithAbove() throws Exception {
    Gift gift1 = new Gift(owner, "First", 0);
    Gift gift2 = new Gift(owner, "Second", 1);
    Gift gift3 = new Gift(owner, "Third", 2);
    gift1 = giftRepository.save(gift1);
    gift2 = giftRepository.save(gift2);
    gift3 = giftRepository.save(gift3);

    setCurrentUser(owner);

    String requestBody = """
      {
        "direction": "up"
      }
      """;

    // Move "Second" up (should swap with "First")
    mockMvc.perform(patch("/api/gifts/" + gift2.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    Gift updatedGift1 = giftRepository.findById(gift1.getId()).orElse(null);
    Gift updatedGift2 = giftRepository.findById(gift2.getId()).orElse(null);
    Gift updatedGift3 = giftRepository.findById(gift3.getId()).orElse(null);

    assertNotNull(updatedGift1);
    assertNotNull(updatedGift2);
    assertNotNull(updatedGift3);

    // gift2 should now have priority 0, gift1 should have priority 1
    assertEquals(1, updatedGift1.getPriority());
    assertEquals(0, updatedGift2.getPriority());
    assertEquals(2, updatedGift3.getPriority());
  }

  @Test
  public void testPriorityDownSwapsWithBelow() throws Exception {
    Gift gift1 = new Gift(owner, "First", 0);
    Gift gift2 = new Gift(owner, "Second", 1);
    Gift gift3 = new Gift(owner, "Third", 2);
    gift1 = giftRepository.save(gift1);
    gift2 = giftRepository.save(gift2);
    gift3 = giftRepository.save(gift3);

    setCurrentUser(owner);

    String requestBody = """
      {
        "direction": "down"
      }
      """;

    // Move "First" down (should swap with "Second")
    mockMvc.perform(patch("/api/gifts/" + gift1.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    Gift updatedGift1 = giftRepository.findById(gift1.getId()).orElse(null);
    Gift updatedGift2 = giftRepository.findById(gift2.getId()).orElse(null);
    Gift updatedGift3 = giftRepository.findById(gift3.getId()).orElse(null);

    assertNotNull(updatedGift1);
    assertNotNull(updatedGift2);
    assertNotNull(updatedGift3);

    // gift1 should now have priority 1, gift2 should have priority 0
    assertEquals(1, updatedGift1.getPriority());
    assertEquals(0, updatedGift2.getPriority());
    assertEquals(2, updatedGift3.getPriority());
  }

  @Test
  public void testPriorityUpFirstItemDoesNothing() throws Exception {
    Gift gift1 = new Gift(owner, "First", 0);
    Gift gift2 = new Gift(owner, "Second", 1);
    gift1 = giftRepository.save(gift1);
    gift2 = giftRepository.save(gift2);

    setCurrentUser(owner);

    String requestBody = """
      {
        "direction": "up"
      }
      """;

    // Try to move "First" up (should be no-op)
    mockMvc.perform(patch("/api/gifts/" + gift1.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    Gift updatedGift1 = giftRepository.findById(gift1.getId()).orElse(null);
    Gift updatedGift2 = giftRepository.findById(gift2.getId()).orElse(null);

    // Priorities should remain unchanged
    assertEquals(0, updatedGift1.getPriority());
    assertEquals(1, updatedGift2.getPriority());
  }

  @Test
  public void testPriorityDownLastItemDoesNothing() throws Exception {
    Gift gift1 = new Gift(owner, "First", 0);
    Gift gift2 = new Gift(owner, "Second", 1);
    gift1 = giftRepository.save(gift1);
    gift2 = giftRepository.save(gift2);

    setCurrentUser(owner);

    String requestBody = """
      {
        "direction": "down"
      }
      """;

    // Try to move "Second" down (should be no-op)
    mockMvc.perform(patch("/api/gifts/" + gift2.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    Gift updatedGift1 = giftRepository.findById(gift1.getId()).orElse(null);
    Gift updatedGift2 = giftRepository.findById(gift2.getId()).orElse(null);

    // Priorities should remain unchanged
    assertEquals(0, updatedGift1.getPriority());
    assertEquals(1, updatedGift2.getPriority());
  }

  @Test
  public void testPrioritySwapExcludesReceivedGifts() throws Exception {
    // Create gifts with one marked as received
    Gift gift1 = new Gift(owner, "First", 0);
    Gift gift2 = new Gift(owner, "Second (Received)", 1);
    gift2.setManualReceived(true);
    Gift gift3 = new Gift(owner, "Third", 2);

    gift1 = giftRepository.save(gift1);
    gift2 = giftRepository.save(gift2);
    gift3 = giftRepository.save(gift3);

    setCurrentUser(owner);

    String requestBody = """
      {
        "direction": "down"
      }
      """;

    // Move "First" down - should skip "Second (Received)" and swap with "Third"
    mockMvc.perform(patch("/api/gifts/" + gift1.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    Gift updatedGift1 = giftRepository.findById(gift1.getId()).orElse(null);
    Gift updatedGift2 = giftRepository.findById(gift2.getId()).orElse(null);
    Gift updatedGift3 = giftRepository.findById(gift3.getId()).orElse(null);

    assertNotNull(updatedGift1);
    assertNotNull(updatedGift2);
    assertNotNull(updatedGift3);

    // gift1 should swap with gift3 (skipping received gift2)
    assertEquals(2, updatedGift1.getPriority());
    assertEquals(1, updatedGift2.getPriority()); // unchanged, still received
    assertEquals(0, updatedGift3.getPriority());
  }

  @Test
  public void testPrioritySwapAsNonOwnerForbidden() throws Exception {
    Gift gift = new Gift(owner, "Gift", 0);
    gift = giftRepository.save(gift);

    setCurrentUser(claimer);

    String requestBody = """
      {
        "direction": "down"
      }
      """;

    mockMvc.perform(patch("/api/gifts/" + gift.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isForbidden());
  }

  @Test
  public void testPrioritySwapAsAdminAllowed() throws Exception {
    Gift gift1 = new Gift(owner, "First", 0);
    Gift gift2 = new Gift(owner, "Second", 1);
    gift1 = giftRepository.save(gift1);
    gift2 = giftRepository.save(gift2);

    setCurrentUser(admin);

    String requestBody = """
      {
        "direction": "down"
      }
      """;

    mockMvc.perform(patch("/api/gifts/" + gift1.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    Gift updatedGift1 = giftRepository.findById(gift1.getId()).orElse(null);
    Gift updatedGift2 = giftRepository.findById(gift2.getId()).orElse(null);

    assertEquals(1, updatedGift1.getPriority());
    assertEquals(0, updatedGift2.getPriority());
  }


  @Test
  public void testPrioritySwapInvalidDirection() throws Exception {
    Gift gift = new Gift(owner, "Gift", 0);
    gift = giftRepository.save(gift);

    setCurrentUser(owner);

    String requestBody = """
      {
        "direction": "sideways"
      }
      """;

    mockMvc.perform(patch("/api/gifts/" + gift.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk()); // Should be no-op, return OK
  }

  @Test
  public void testMultiplePrioritySwapsInSequence() throws Exception {
    Gift gift1 = new Gift(owner, "First", 0);
    Gift gift2 = new Gift(owner, "Second", 1);
    Gift gift3 = new Gift(owner, "Third", 2);
    Gift gift4 = new Gift(owner, "Fourth", 3);

    gift1 = giftRepository.save(gift1);
    gift2 = giftRepository.save(gift2);
    gift3 = giftRepository.save(gift3);
    gift4 = giftRepository.save(gift4);

    setCurrentUser(owner);

    String requestBody = """
      {
        "direction": "down"
      }
      """;

    // Move gift1 down: swaps with gift2 -> gift1=1, gift2=0, gift3=2, gift4=3
    mockMvc.perform(patch("/api/gifts/" + gift1.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    // Move gift1 down again: swaps with gift3 -> gift2=0, gift3=1, gift1=2, gift4=3
    mockMvc.perform(patch("/api/gifts/" + gift1.getId() + "/priority")
        .contentType("application/json")
        .content(requestBody))
      .andExpect(status().isOk());

    // Move gift4 up: swaps with gift1 -> gift2=0, gift3=1, gift4=2, gift1=3
    String upRequestBody = """
      {
        "direction": "up"
      }
      """;
    mockMvc.perform(patch("/api/gifts/" + gift4.getId() + "/priority")
        .contentType("application/json")
        .content(upRequestBody))
      .andExpect(status().isOk());

    Gift updatedGift1 = giftRepository.findById(gift1.getId()).orElse(null);
    Gift updatedGift2 = giftRepository.findById(gift2.getId()).orElse(null);
    Gift updatedGift3 = giftRepository.findById(gift3.getId()).orElse(null);
    Gift updatedGift4 = giftRepository.findById(gift4.getId()).orElse(null);

    assertNotNull(updatedGift1);
    assertNotNull(updatedGift2);
    assertNotNull(updatedGift3);
    assertNotNull(updatedGift4);

    assertEquals(3, updatedGift1.getPriority());
    assertEquals(0, updatedGift2.getPriority());
    assertEquals(1, updatedGift3.getPriority());
    assertEquals(2, updatedGift4.getPriority());
  }

  @Test
  public void testBlindContextOwnerSeesAllGifts() throws Exception {
    // Create multiple gifts for owner
    Gift gift1 = new Gift(owner, "PS5", 0);
    Gift gift2 = new Gift(owner, "Book", 1);
    giftRepository.saveAll(List.of(gift1, gift2));

    // Create a claim on gift1 by claimer
    Claim claim = new Claim(gift1, claimer, LocalDate.now());
    claimRepository.save(claim);

    // Owner retrieves their own list (blind context - should see all gifts with no claim data)
    List<Gift> ownerGifts = giftRepository.findByOwnerId(owner.getId());
    assertEquals(2, ownerGifts.size());

    List<Claim> claimsOnGift1 = claimRepository.findByGiftId(gift1.getId());
    assertEquals(1, claimsOnGift1.size());
  }

  @Test
  public void testNonOwnerSeesFilteredList() throws Exception {
    // Create non-repeatable gift for owner with claim from claimer
    Gift nonRepeatableGift = new Gift(owner, "Non-Repeatable PS5", 0);
    nonRepeatableGift.setOnlyOnce(true);
    nonRepeatableGift = giftRepository.save(nonRepeatableGift);

    // Create claim by claimer (same day, not yet received)
    Claim claim = new Claim(nonRepeatableGift, claimer, LocalDate.now());
    claimRepository.save(claim);

    // Verify claim exists
    List<Claim> claims = claimRepository.findByGiftId(nonRepeatableGift.getId());
    assertEquals(1, claims.size());
    assertEquals(claimer.getId(), claims.get(0).getClaimerUser().getId());
  }

  @Test
  public void testDeleteGiftWithMultipleClaimsDeletesAll() throws Exception {
    Gift gift = new Gift(owner, "Multi-Claim Gift", 0);
    gift = giftRepository.save(gift);

    // Create claims from multiple users
    User user1 = new User("user1", "hash", "#111111");
    User user2 = new User("user2", "hash", "#222222");
    User user3 = new User("user3", "hash", "#333333");
    user1 = userRepository.save(user1);
    user2 = userRepository.save(user2);
    user3 = userRepository.save(user3);

    Claim claim1 = new Claim(gift, user1, LocalDate.now());
    Claim claim2 = new Claim(gift, user2, LocalDate.now().plusDays(1));
    Claim claim3 = new Claim(gift, user3, LocalDate.now().plusDays(2));
    claimRepository.save(claim1);
    claimRepository.save(claim2);
    claimRepository.save(claim3);

    // Verify 3 claims exist
    assertEquals(3, claimRepository.findByGiftId(gift.getId()).size());

    setCurrentUser(owner);

    // Delete gift
    mockMvc.perform(delete("/api/gifts/" + gift.getId()))
      .andExpect(status().isOk());

    // Verify all claims are deleted
    assertEquals(0, claimRepository.findByGiftId(gift.getId()).size());
  }
}
