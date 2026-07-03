package com.giftpile.service;

import com.giftpile.entity.Claim;
import com.giftpile.entity.Gift;
import com.giftpile.entity.User;
import com.giftpile.repository.ClaimRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class GiftVisibilityServiceTest {

  private GiftVisibilityService giftVisibilityService;

  @Mock
  private ClaimRepository claimRepository;

  private User ownerUser;
  private User viewerUser;
  private User otherUser;

  @BeforeEach
  public void setUp() {
    MockitoAnnotations.openMocks(this);
    giftVisibilityService = new GiftVisibilityService(claimRepository);

    ownerUser = new User("owner", "hashedPassword", "#FF0000");
    ownerUser.setId(1L);

    viewerUser = new User("viewer", "hashedPassword", "#00FF00");
    viewerUser.setId(2L);

    otherUser = new User("other", "hashedPassword", "#0000FF");
    otherUser.setId(3L);
  }

  // ==================== Blind Context Tests ====================

  @Test
  public void blindContextStripsAllClaimData() {
    // Test: In blind context, all gifts are shown but claim data is stripped.
    Gift gift = createGift(1L, ownerUser, "Book", true);
    gift.setId(1L);

    Claim claim = new Claim(gift, otherUser, LocalDate.now());
    claim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(claim));

    // Filter in blind context (isBlindContext=true)
    List<Gift> filtered = giftVisibilityService.filterForViewer(gifts, viewerUser.getId(), ownerUser.getId(), true);

    // Gift should be shown
    assertEquals(1, filtered.size());
    assertEquals("Book", filtered.get(0).getTitle());
  }

  @Test
  public void blindContextShowsAllGifts() {
    // Test: Blind context shows all gifts, regardless of claim status
    Gift gift1 = createGift(1L, ownerUser, "Gift 1", true);
    gift1.setId(1L);
    Gift gift2 = createGift(2L, ownerUser, "Gift 2", true);
    gift2.setId(2L);

    when(claimRepository.findByGiftId(1L)).thenReturn(new ArrayList<>());
    when(claimRepository.findByGiftId(2L)).thenReturn(new ArrayList<>());

    List<Gift> gifts = List.of(gift1, gift2);

    List<Gift> filtered = giftVisibilityService.filterForViewer(gifts, viewerUser.getId(), ownerUser.getId(), true);

    assertEquals(2, filtered.size());
  }

  // ==================== Non-Repeatable Claimed-by-Others Tests ====================

  @Test
  public void nonRepeatableClaimedByOtherHiddenWhenNotReceived() {
    // Test: Non-repeatable gift claimed by someone else is hidden until effectiveReceived
    Gift gift = createGift(1L, ownerUser, "Non-Repeatable Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate futureDate = LocalDate.now().plusDays(5);
    Claim claim = new Claim(gift, otherUser, futureDate);
    claim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(claim));

    // Viewer is not the claimer, gift is non-repeatable, and claim date is in the future
    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be hidden
    assertEquals(0, filtered.size());
  }

  @Test
  public void nonRepeatableClaimedByOtherShownWhenEffectivelyReceived() {
    // Test: Non-repeatable gift claimed by someone else is shown when effectiveReceived
    Gift gift = createGift(1L, ownerUser, "Non-Repeatable Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate pastDate = LocalDate.now().minusDays(1);
    Claim claim = new Claim(gift, otherUser, pastDate);
    claim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(claim));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Received gifts are private to the owner: hidden from other viewers.
    assertEquals(0, filtered.size());
  }

  @Test
  public void nonRepeatableClaimedByOtherHiddenWhenManuallyReceived() {
    // Test: Non-repeatable gift claimed by someone else is shown when manually marked received
    Gift gift = createGift(1L, ownerUser, "Non-Repeatable Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(true);
    gift.setManualReceived(true);

    LocalDate futureDate = LocalDate.now().plusDays(5);
    Claim claim = new Claim(gift, otherUser, futureDate);
    claim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(claim));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Received gifts are private to the owner: hidden from other viewers.
    assertEquals(0, filtered.size());
  }

  // ==================== Repeatable Gift Tests ====================

  @Test
  public void repeatableGiftShowsOwnClaimOnly() {
    // Test: Repeatable gifts are shown to all viewers, but only viewer's own claim is exposed
    Gift gift = createGift(1L, ownerUser, "Repeatable Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(false);

    Claim viewerClaim = new Claim(gift, viewerUser, LocalDate.now());
    viewerClaim.setId(1L);
    Claim otherClaim = new Claim(gift, otherUser, LocalDate.now());
    otherClaim.setId(2L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(viewerClaim, otherClaim));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be shown (repeatable)
    assertEquals(1, filtered.size());
  }

  @Test
  public void repeatableGiftShownToAllViewers() {
    // Test: Repeatable gifts are shown to all viewers, not just those who claimed
    Gift gift = createGift(1L, ownerUser, "Repeatable Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(false);

    Claim otherClaim = new Claim(gift, otherUser, LocalDate.now());
    otherClaim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(otherClaim));

    // ViewerUser is NOT a claimer, but gift is repeatable
    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be shown (repeatable gifts shown to all)
    assertEquals(1, filtered.size());
  }

  @Test
  public void repeatableGiftWithMultipleClaims() {
    // Test: Repeatable gift with multiple claims from different users is shown
    Gift gift = createGift(1L, ownerUser, "Repeatable Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(false);

    Claim claim1 = new Claim(gift, otherUser, LocalDate.now());
    claim1.setId(1L);
    Claim claim2 = new Claim(gift, viewerUser, LocalDate.now().plusDays(1));
    claim2.setId(2L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(claim1, claim2));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be shown
    assertEquals(1, filtered.size());
  }

  // ==================== Viewer's Own Claim Tests ====================

  @Test
  public void giftShownWhenViewerHasOwnClaim() {
    // Test: Gift is always shown when viewer is the claimer
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(true);

    Claim viewerClaim = new Claim(gift, viewerUser, LocalDate.now().plusDays(10));
    viewerClaim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(viewerClaim));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be shown (viewer is the claimer)
    assertEquals(1, filtered.size());
  }

  // ==================== No Claims Tests ====================

  @Test
  public void giftShownWhenNoClaims() {
    // Test: Gift is always shown when there are no claims
    Gift gift = createGift(1L, ownerUser, "Unclaimed Gift", true);
    gift.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(new ArrayList<>());

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be shown (no claims)
    assertEquals(1, filtered.size());
  }

  // ==================== effectiveReceived Tests ====================

  @Test
  public void effectiveReceivedTrueWhenManuallyReceived() {
    // Test: effectiveReceived is true when gift.manualReceived is true
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setManualReceived(true);

    Claim claim = new Claim(gift, otherUser, LocalDate.now().plusDays(100));
    claim.setId(1L);

    LocalDate today = LocalDate.now();
    boolean result = giftVisibilityService.isEffectiveReceived(gift, claim, today);

    assertTrue(result);
  }

  @Test
  public void effectiveReceivedTrueWhenTodayAfterGiftDate() {
    // Test: effectiveReceived is true when today > claim.giftDate for non-repeatable gifts
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate yesterday = LocalDate.now().minusDays(1);
    Claim claim = new Claim(gift, otherUser, yesterday);
    claim.setId(1L);

    LocalDate today = LocalDate.now();
    boolean result = giftVisibilityService.isEffectiveReceived(gift, claim, today);

    assertTrue(result);
  }

  @Test
  public void effectiveReceivedFalseWhenTodayEqualsGiftDate() {
    // Test: effectiveReceived is false when today == claim.giftDate
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate today = LocalDate.now();
    Claim claim = new Claim(gift, otherUser, today);
    claim.setId(1L);

    boolean result = giftVisibilityService.isEffectiveReceived(gift, claim, today);

    assertFalse(result);
  }

  @Test
  public void effectiveReceivedFalseWhenTodayBeforeGiftDate() {
    // Test: effectiveReceived is false when today < claim.giftDate
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate tomorrow = LocalDate.now().plusDays(1);
    Claim claim = new Claim(gift, otherUser, tomorrow);
    claim.setId(1L);

    LocalDate today = LocalDate.now();
    boolean result = giftVisibilityService.isEffectiveReceived(gift, claim, today);

    assertFalse(result);
  }

  @Test
  public void effectiveReceivedFalseForRepeatableGiftEvenIfTodayAfter() {
    // Test: For repeatable gifts (onlyOnce=false), today > giftDate does not make it received
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setOnlyOnce(false);
    gift.setManualReceived(false);

    LocalDate yesterday = LocalDate.now().minusDays(1);
    Claim claim = new Claim(gift, otherUser, yesterday);
    claim.setId(1L);

    LocalDate today = LocalDate.now();
    boolean result = giftVisibilityService.isEffectiveReceived(gift, claim, today);

    // Should be false because it's repeatable (onlyOnce=false)
    assertFalse(result);
  }

  @Test
  public void effectiveReceivedFalseWhenClaimIsNull() {
    // Test: effectiveReceived is false when claim is null and manualReceived is false
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate today = LocalDate.now();
    boolean result = giftVisibilityService.isEffectiveReceived(gift, null, today);

    assertFalse(result);
  }

  // ==================== Auto-Received (effectiveReceived) in Filtered Results Tests ====================

  @Test
  public void autoReceivedHiddenFromOthersWhenTodayAfterDate() {
    // Test: Auto-received gift (claimed by another) is hidden from other viewers
    Gift gift = createGift(1L, ownerUser, "Auto-Received Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate yesterday = LocalDate.now().minusDays(1);
    Claim claim = new Claim(gift, otherUser, yesterday);
    claim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(claim));

    // Different viewer (not the claimer)
    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Received gifts are private to the owner: hidden from other viewers.
    assertEquals(0, filtered.size());
  }

  @Test
  public void autoReceivedHiddenWhenTodayEqualsDate() {
    // Test: Auto-received gift is hidden when today == giftDate
    Gift gift = createGift(1L, ownerUser, "Auto-Received Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(true);
    gift.setManualReceived(false);

    LocalDate today = LocalDate.now();
    Claim claim = new Claim(gift, otherUser, today);
    claim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(claim));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be hidden because it's not yet effectively received
    assertEquals(0, filtered.size());
  }

  // ==================== Complex Scenario Tests ====================

  @Test
  public void multipleGiftsMixedVisibility() {
    // Test: Multiple gifts with mixed visibility rules
    Gift gift1 = createGift(1L, ownerUser, "Unclaimed", true);
    gift1.setId(1L);
    gift1.setOnlyOnce(true);

    Gift gift2 = createGift(2L, ownerUser, "Repeatable Claimed", false);
    gift2.setId(2L);
    gift2.setOnlyOnce(false);

    Gift gift3 = createGift(3L, ownerUser, "Non-Repeatable Claimed By Other", true);
    gift3.setId(3L);
    gift3.setOnlyOnce(true);
    gift3.setManualReceived(false);

    Claim claim2 = new Claim(gift2, otherUser, LocalDate.now());
    claim2.setId(1L);

    LocalDate futureDate = LocalDate.now().plusDays(5);
    Claim claim3 = new Claim(gift3, otherUser, futureDate);
    claim3.setId(2L);

    List<Gift> gifts = List.of(gift1, gift2, gift3);
    when(claimRepository.findByGiftId(1L)).thenReturn(new ArrayList<>());
    when(claimRepository.findByGiftId(2L)).thenReturn(List.of(claim2));
    when(claimRepository.findByGiftId(3L)).thenReturn(List.of(claim3));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Should show gift1 (unclaimed) and gift2 (repeatable)
    // Should hide gift3 (non-repeatable claimed by other, not yet received)
    assertEquals(2, filtered.size());
    assertTrue(filtered.stream().anyMatch(g -> g.getId().equals(1L)));
    assertTrue(filtered.stream().anyMatch(g -> g.getId().equals(2L)));
    assertFalse(filtered.stream().anyMatch(g -> g.getId().equals(3L)));
  }

  @Test
  public void viewerAsClaimer() {
    // Test: Viewer who is also a claimer
    Gift gift = createGift(1L, ownerUser, "Gift", true);
    gift.setId(1L);
    gift.setOnlyOnce(true);

    Claim viewerClaim = new Claim(gift, viewerUser, LocalDate.now().plusDays(20));
    viewerClaim.setId(1L);

    List<Gift> gifts = List.of(gift);
    when(claimRepository.findByGiftId(1L)).thenReturn(List.of(viewerClaim));

    List<Gift> filtered = giftVisibilityService.filterForViewer(
        gifts, viewerUser.getId(), ownerUser.getId(), false);

    // Gift should be shown because viewer is the claimer
    assertEquals(1, filtered.size());
  }

  // ==================== Helper Method ====================

  private Gift createGift(Long id, User owner, String title, boolean onlyOnce) {
    Gift gift = new Gift(owner, title, 1);
    gift.setId(id);
    gift.setOnlyOnce(onlyOnce);
    gift.setManualReceived(false);
    return gift;
  }
}
