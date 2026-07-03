package com.giftpile.service;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import com.giftpile.repository.GiftRepository;
import com.giftpile.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = {"spring.config.location=classpath:application-test.properties"})
@DisplayName("AdminService Guardrail Tests")
class AdminServiceTest {

  @Autowired
  private AdminService adminService;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private GiftRepository giftRepository;

  @Autowired
  private ClaimRepository claimRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  private User admin1;
  private User admin2;
  private User regularUser;

  @BeforeEach
  void setUp() {
    // Clean up
    claimRepository.deleteAll();
    giftRepository.deleteAll();
    userRepository.deleteAll();

    // Create test users
    admin1 = new User("admin1", passwordEncoder.encode("admin123"), "#4C5FE8");
    admin1.setIsAdmin(true);
    admin1 = userRepository.save(admin1);

    admin2 = new User("admin2", passwordEncoder.encode("admin123"), "#FF6B6B");
    admin2.setIsAdmin(true);
    admin2 = userRepository.save(admin2);

    regularUser = new User("user", passwordEncoder.encode("user123"), "#F2A93B");
    regularUser.setIsAdmin(false);
    regularUser = userRepository.save(regularUser);
  }

  @Test
  @DisplayName("Guardrail: Cannot delete last admin")
  void testCannotDeleteLastAdmin() {
    // Remove admin2 from admin role
    admin2.setIsAdmin(false);
    userRepository.save(admin2);

    // Now admin1 is the only admin
    long adminCount = adminService.getAdminCount();
    assertThat(adminCount).isEqualTo(1);

    // Attempt to delete the last admin should fail
    Optional<String> error = adminService.validateDeletion(admin1.getId(), regularUser.getId());
    assertThat(error).isPresent()
      .contains("Cannot delete the last admin");
  }

  @Test
  @DisplayName("Guardrail: Cannot self-delete")
  void testCannotSelfDelete() {
    // Attempt to delete oneself
    Optional<String> error = adminService.validateDeletion(admin1.getId(), admin1.getId());
    assertThat(error).isPresent()
      .contains("Cannot delete your own account");
  }

  @Test
  @DisplayName("Can delete non-admin user")
  void testCanDeleteNonAdminUser() {
    // Should be able to delete a non-admin user
    Optional<String> error = adminService.validateDeletion(regularUser.getId(), admin1.getId());
    assertThat(error).isEmpty();
  }

  @Test
  @DisplayName("Can delete admin when multiple admins exist")
  void testCanDeleteAdminWhenMultipleExist() {
    // With two admins, should be able to delete one
    long adminCount = adminService.getAdminCount();
    assertThat(adminCount).isEqualTo(2);

    // Attempt to delete admin2 (not self) should succeed
    Optional<String> error = adminService.validateDeletion(admin2.getId(), admin1.getId());
    assertThat(error).isEmpty();
  }

  @Test
  @DisplayName("Cannot delete user that doesn't exist")
  void testCannotDeleteNonexistentUser() {
    // Attempt to delete non-existent user
    Optional<String> error = adminService.validateDeletion(999L, admin1.getId());
    assertThat(error).isPresent()
      .contains("User not found");
  }

  @Test
  @DisplayName("Deletion cascades to user's gifts")
  void testDeletionCascadesToUserGifts() {
    // Create gifts owned by regularUser
    Gift gift1 = new Gift(regularUser, "Gift 1", 0);
    gift1 = giftRepository.save(gift1);

    Gift gift2 = new Gift(regularUser, "Gift 2", 1);
    gift2 = giftRepository.save(gift2);

    long giftId1 = gift1.getId();
    long giftId2 = gift2.getId();

    // Verify gifts exist
    assertThat(giftRepository.findById(giftId1)).isPresent();
    assertThat(giftRepository.findById(giftId2)).isPresent();

    // Delete the user
    adminService.deleteUser(regularUser.getId());

    // Verify gifts were deleted
    assertThat(giftRepository.findById(giftId1)).isEmpty();
    assertThat(giftRepository.findById(giftId2)).isEmpty();
  }

  @Test
  @DisplayName("Deletion cascades to claims made by user")
  void testDeletionCascadesToClaimsByUser() {
    // Create a gift owned by admin1
    Gift gift = new Gift(admin1, "Gift", 0);
    gift = giftRepository.save(gift);

    // Create claims by regularUser
    Claim claim1 = new Claim(gift, regularUser, LocalDate.now());
    claim1 = claimRepository.save(claim1);

    Claim claim2 = new Claim(gift, regularUser, LocalDate.now().plusDays(1));
    claim2 = claimRepository.save(claim2);

    long claimId1 = claim1.getId();
    long claimId2 = claim2.getId();

    // Verify claims exist
    assertThat(claimRepository.findById(claimId1)).isPresent();
    assertThat(claimRepository.findById(claimId2)).isPresent();

    // Delete the user who made the claims
    adminService.deleteUser(regularUser.getId());

    // Verify claims were deleted
    assertThat(claimRepository.findById(claimId1)).isEmpty();
    assertThat(claimRepository.findById(claimId2)).isEmpty();
  }

  @Test
  @DisplayName("Deletion cascades to claims on user's gifts")
  void testDeletionCascadesToClaimsOnUserGifts() {
    // Create a gift owned by regularUser
    Gift gift = new Gift(regularUser, "Gift", 0);
    gift = giftRepository.save(gift);

    // Create a claim on the gift by admin1
    Claim claim = new Claim(gift, admin1, LocalDate.now());
    claim = claimRepository.save(claim);

    long claimId = claim.getId();

    // Verify claim exists
    assertThat(claimRepository.findById(claimId)).isPresent();

    // Delete the gift owner
    adminService.deleteUser(regularUser.getId());

    // Verify the gift and its claim were deleted
    assertThat(giftRepository.findById(gift.getId())).isEmpty();
    assertThat(claimRepository.findById(claimId)).isEmpty();
  }

  @Test
  @DisplayName("Deletion removes user from database")
  void testDeletionRemovesUserFromDatabase() {
    long userId = regularUser.getId();

    // Verify user exists
    assertThat(userRepository.findById(userId)).isPresent();

    // Delete the user
    adminService.deleteUser(userId);

    // Verify user was deleted
    assertThat(userRepository.findById(userId)).isEmpty();
  }

  @Test
  @DisplayName("Admin count reflects actual admin users")
  void testAdminCountIsAccurate() {
    // Initially 2 admins
    long count = adminService.getAdminCount();
    assertThat(count).isEqualTo(2);

    // Demote admin2
    admin2.setIsAdmin(false);
    userRepository.save(admin2);

    count = adminService.getAdminCount();
    assertThat(count).isEqualTo(1);

    // Promote regularUser
    regularUser.setIsAdmin(true);
    userRepository.save(regularUser);

    count = adminService.getAdminCount();
    assertThat(count).isEqualTo(2);
  }

  @Test
  @DisplayName("Validation allows deletion when conditions are met")
  void testValidationAllowsDeletionWhenGuardrailsSatisfied() {
    // admin1 deleting admin2 (multiple admins exist, not self)
    Optional<String> error = adminService.validateDeletion(admin2.getId(), admin1.getId());
    assertThat(error).isEmpty();

    // admin1 deleting regularUser
    error = adminService.validateDeletion(regularUser.getId(), admin1.getId());
    assertThat(error).isEmpty();
  }

  @Test
  @DisplayName("Multiple guardrail violations are caught (self-delete and last admin)")
  void testMultipleGuardrailsCaught() {
    // Setup: admin1 is the only admin
    admin2.setIsAdmin(false);
    userRepository.save(admin2);

    // Self-delete of only admin should fail (self-delete check comes first)
    Optional<String> error = adminService.validateDeletion(admin1.getId(), admin1.getId());
    assertThat(error).isPresent()
      .contains("Cannot delete your own account");
  }

  @Test
  @DisplayName("Deletion of admin with multiple claims cascades all claims")
  void testDeletionOfAdminWithMultipleClaimsOnMultipleGifts() {
    // Create multiple gifts
    Gift gift1 = new Gift(regularUser, "Gift 1", 0);
    gift1 = giftRepository.save(gift1);

    Gift gift2 = new Gift(regularUser, "Gift 2", 1);
    gift2 = giftRepository.save(gift2);

    // Create multiple claims by admin1 on different gifts
    Claim claim1 = new Claim(gift1, admin1, LocalDate.now());
    claim1 = claimRepository.save(claim1);

    Claim claim2 = new Claim(gift2, admin1, LocalDate.now().plusDays(5));
    claim2 = claimRepository.save(claim2);

    long claimId1 = claim1.getId();
    long claimId2 = claim2.getId();

    // Delete admin1
    adminService.deleteUser(admin1.getId());

    // Verify all claims were deleted
    assertThat(claimRepository.findById(claimId1)).isEmpty();
    assertThat(claimRepository.findById(claimId2)).isEmpty();

    // Verify gifts still exist (only claims should be deleted)
    assertThat(giftRepository.findById(gift1.getId())).isPresent();
    assertThat(giftRepository.findById(gift2.getId())).isPresent();
  }

  @Test
  @DisplayName("Self-delete validation is performed before last-admin validation")
  void testSelfDeleteValidationOrderingMatters() {
    // Setup: admin1 is the only admin
    admin2.setIsAdmin(false);
    userRepository.save(admin2);

    // Attempt self-delete of the only admin
    Optional<String> error = adminService.validateDeletion(admin1.getId(), admin1.getId());

    // Should fail on self-delete, not last-admin
    assertThat(error).isPresent()
      .contains("Cannot delete your own account");
  }

  @Test
  @DisplayName("Can delete last admin if not self-deleting")
  void testCannotDeleteLastAdminEvenIfNotSelfDelete() {
    // Make admin1 the only admin
    admin2.setIsAdmin(false);
    userRepository.save(admin2);

    // Attempt to delete admin1 by regularUser (not self-delete, but last admin)
    Optional<String> error = adminService.validateDeletion(admin1.getId(), regularUser.getId());

    // Should fail on last-admin check
    assertThat(error).isPresent()
      .contains("Cannot delete the last admin");
  }

  @Test
  @DisplayName("getAllUsers returns correct list of users")
  void testGetAllUsersReturnsCorrectList() {
    List<User> users = adminService.getAllUsers();
    assertThat(users).hasSize(3)
      .extracting(User::getName)
      .contains("admin1", "admin2", "user");
  }

  @Test
  @DisplayName("Deletion only affects the target user's gifts, not others")
  void testDeletionOnlyAffectsTargetUserGifts() {
    // Create gifts for both users
    Gift adminGift = new Gift(admin1, "Admin Gift", 0);
    adminGift = giftRepository.save(adminGift);

    Gift userGift = new Gift(regularUser, "User Gift", 0);
    userGift = giftRepository.save(userGift);

    long adminGiftId = adminGift.getId();
    long userGiftId = userGift.getId();

    // Delete regularUser
    adminService.deleteUser(regularUser.getId());

    // Verify only user's gift was deleted
    assertThat(giftRepository.findById(adminGiftId)).isPresent();
    assertThat(giftRepository.findById(userGiftId)).isEmpty();
  }

  @Test
  @DisplayName("Deletion cascades but preserves other users' claims")
  void testDeletionPreservesOtherUsersClaims() {
    // Create a gift
    Gift gift = new Gift(regularUser, "Gift", 0);
    gift = giftRepository.save(gift);

    // Create claims by different users
    Claim claimByAdmin1 = new Claim(gift, admin1, LocalDate.now());
    claimByAdmin1 = claimRepository.save(claimByAdmin1);

    Claim claimByAdmin2 = new Claim(gift, admin2, LocalDate.now().plusDays(1));
    claimByAdmin2 = claimRepository.save(claimByAdmin2);

    long claimId1 = claimByAdmin1.getId();
    long claimId2 = claimByAdmin2.getId();

    // Delete admin1
    adminService.deleteUser(admin1.getId());

    // Verify admin1's claim was deleted but admin2's claim remains
    assertThat(claimRepository.findById(claimId1)).isEmpty();
    assertThat(claimRepository.findById(claimId2)).isPresent();
  }
}
