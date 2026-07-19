package com.giftpile.controller;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.KidManager;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.KidManagerRepository;
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

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Kid-user behaviour on H2 (no Docker): guardian visibility, admin invariants, login gating, and
 * the upgrade path.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
  properties = {"spring.config.location=classpath:application-test.properties"})
public class KidUserIntegrationTest {

  @Autowired private WebApplicationContext webApplicationContext;
  @Autowired private UserRepository userRepository;
  @Autowired private GiftRepository giftRepository;
  @Autowired private ClaimRepository claimRepository;
  @Autowired private KidManagerRepository kidManagerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  private MockMvc mockMvc;
  private User admin;
  private User parent;
  private User giver;
  private User kid;
  private Gift kidGift;

  @BeforeEach
  public void setup() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
      .apply(springSecurity())
      .build();
    kidManagerRepository.deleteAll();
    claimRepository.deleteAll();
    giftRepository.deleteAll();
    userRepository.deleteAll();

    admin = save("admin", true, false, true);
    parent = save("parent", false, false, true);
    giver = save("giver", false, false, true);
    kid = save("kid", false, true, false);
    kidManagerRepository.save(new KidManager(kid.getId(), parent.getId()));

    kidGift = new Gift(kid, "Train", 0);
    kidGift.setOnlyOnce(true);
    kidGift = giftRepository.save(kidGift);
    // Someone outside the family claims it — normally hidden from other viewers.
    claimRepository.save(new Claim(kidGift, giver, LocalDate.now().plusDays(30)));
  }

  private User save(String name, boolean isAdmin, boolean isKid, boolean canLogin) {
    User u = new User(name, passwordEncoder.encode("password123"), "#123456");
    u.setIsAdmin(isAdmin);
    u.setIsKid(isKid);
    u.setCanLogin(canLogin);
    return userRepository.save(u);
  }

  @Test
  @WithMockUser(username = "parent")
  public void guardianSeesClaimedGiftWithAttribution() throws Exception {
    mockMvc.perform(get("/api/users/" + kid.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(1)))
      .andExpect(jsonPath("$[0].title").value("Train"))
      .andExpect(jsonPath("$[0].claims", hasSize(1)))
      .andExpect(jsonPath("$[0].claims[0].claimerName").value("giver"));
  }

  @Test
  @WithMockUser(username = "parent")
  public void guardianCanManageMeta() throws Exception {
    mockMvc.perform(get("/api/users/" + kid.getId()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.isKid").value(true))
      .andExpect(jsonPath("$.canManage").value(true));
  }

  @Test
  @WithMockUser(username = "stranger")
  public void nonManagerHasClaimedGiftHiddenAndCannotManage() throws Exception {
    // A non-manager who is not the claimer sees the one-time claimed gift hidden (reveal rules).
    save("stranger", false, false, true);
    mockMvc.perform(get("/api/users/" + kid.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(0)));
    mockMvc.perform(get("/api/users/" + kid.getId()))
      .andExpect(jsonPath("$.canManage").value(false));
  }

  @Test
  @WithMockUser(username = "admin", roles = {"ADMIN"})
  public void kidCannotAlsoBeAdmin() throws Exception {
    mockMvc.perform(post("/api/admin/users")
        .contentType("application/json")
        .content("{\"name\":\"kid2\",\"isKid\":true,\"isAdmin\":true}"))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.message").value(containsString("admin")));
  }

  @Test
  @WithMockUser(username = "admin", roles = {"ADMIN"})
  public void kidCannotManageAnotherKid() throws Exception {
    User kid2 = save("kid2", false, true, false);
    mockMvc.perform(put("/api/admin/users/" + kid2.getId())
        .contentType("application/json")
        .content("{\"parentIds\":[" + kid.getId() + "]}"))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.message").value(containsString("kid")));
  }

  @Test
  public void noLoginKidHiddenFromPreLoginPicker() throws Exception {
    // Unauthenticated: the no-login kid is absent from the picker.
    mockMvc.perform(get("/api/users"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[*].name", not(hasItem("kid"))))
      .andExpect(jsonPath("$[*].name", hasItem("parent")));
  }

  @Test
  @WithMockUser(username = "parent")
  public void kidVisibleInFamilyListWhenAuthenticated() throws Exception {
    mockMvc.perform(get("/api/users"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[*].name", hasItem("kid")));
  }

  @Test
  @WithMockUser(username = "admin", roles = {"ADMIN"})
  public void adminBrowsingFamilyListSeesRevealNotBlind() throws Exception {
    // An admin who is not a manager browses the kid's list via the normal path: the one-time gift
    // claimed by someone else must be hidden (reveal), not shown blind.
    mockMvc.perform(get("/api/users/" + kid.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  @WithMockUser(username = "admin", roles = {"ADMIN"})
  public void becomingAKidDropsManagerLinksHeld() throws Exception {
    // parent manages kid. Flip parent into a kid — it must lose its manager link, so it can never
    // guardian-view the kid it used to manage.
    mockMvc.perform(put("/api/admin/users/" + parent.getId())
        .contentType("application/json")
        .content("{\"isKid\":true}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.isKid").value(true));

    org.junit.jupiter.api.Assertions.assertFalse(
      kidManagerRepository.existsByKidUserIdAndManagerUserId(kid.getId(), parent.getId()));
  }

  @Test
  public void noLoginKidCannotAuthenticate() throws Exception {
    mockMvc.perform(post("/api/auth/login")
        .contentType("application/json")
        .content("{\"userId\":" + kid.getId() + ",\"password\":\"password123\"}"))
      .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(username = "admin", roles = {"ADMIN"})
  public void upgradePreservesGiftsAndRevokesParents() throws Exception {
    mockMvc.perform(put("/api/admin/users/" + kid.getId())
        .contentType("application/json")
        .content("{\"isKid\":false,\"password\":\"newpass123\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.isKid").value(false));

    // Gifts (and the claim on them) survive the upgrade.
    org.junit.jupiter.api.Assertions.assertEquals(1, giftRepository.findByOwnerId(kid.getId()).size());
    // Parent links are gone.
    org.junit.jupiter.api.Assertions.assertTrue(
      kidManagerRepository.findByKidUserId(kid.getId()).isEmpty());
  }

  @Test
  @WithMockUser(username = "parent")
  public void formerParentLosesGuardianAccessAfterUpgrade() throws Exception {
    kid.setIsKid(false);
    userRepository.save(kid);
    kidManagerRepository.findByKidUserId(kid.getId()).forEach(kidManagerRepository::delete);

    // Now an ordinary viewer: the claimed one-time gift is hidden again.
    mockMvc.perform(get("/api/users/" + kid.getId() + "/gifts"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(0)));
    mockMvc.perform(get("/api/users/" + kid.getId()))
      .andExpect(jsonPath("$.canManage").value(false));
  }
}
