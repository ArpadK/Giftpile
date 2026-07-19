package com.giftpile.service;

import com.giftpile.entity.User;
import com.giftpile.repository.KidManagerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Context resolution is the guardrail for the owner-blind invariant — cover every branch. */
public class GuardianServiceTest {
  private GuardianService guardianService;

  @Mock
  private KidManagerRepository kidManagerRepository;

  private User kid;
  private User parent;
  private User other;
  private User admin;

  @BeforeEach
  public void setUp() {
    MockitoAnnotations.openMocks(this);
    guardianService = new GuardianService(kidManagerRepository);

    kid = new User("kid", "hash", "#111111");
    kid.setId(1L);
    kid.setIsKid(true);

    parent = new User("parent", "hash", "#222222");
    parent.setId(2L);

    other = new User("other", "hash", "#333333");
    other.setId(3L);

    admin = new User("admin", "hash", "#444444");
    admin.setId(4L);
    admin.setIsAdmin(true);
  }

  private void link(User kidUser, User managerUser) {
    when(kidManagerRepository.existsByKidUserIdAndManagerUserId(kidUser.getId(), managerUser.getId()))
      .thenReturn(true);
  }

  @Test
  public void guardianOfManagedKid() {
    link(kid, parent);
    assertTrue(guardianService.isGuardianOf(parent, kid));
    assertEquals(ViewContext.GUARDIAN, guardianService.contextFor(parent, kid));
    assertTrue(guardianService.canManageList(parent, kid));
  }

  @Test
  public void notGuardianWhenNoLink() {
    assertFalse(guardianService.isGuardianOf(other, kid));
    assertEquals(ViewContext.REVEAL, guardianService.contextFor(other, kid));
    assertFalse(guardianService.canManageList(other, kid));
  }

  @Test
  public void notGuardianWhenOwnerIsNotAKid() {
    // A non-kid owner is never guarded, regardless of any stray link rows.
    assertFalse(guardianService.isGuardianOf(parent, other));
    verifyNoInteractions(kidManagerRepository);
  }

  @Test
  public void ownViewIsBlind() {
    assertEquals(ViewContext.BLIND, guardianService.contextFor(other, other));
  }

  @Test
  public void adminViewingNonManagedListIsReveal() {
    // Admin-edit blindness is served by the dedicated admin endpoint; an admin browsing the
    // family list is an ordinary reveal viewer. But they may still manage (edit) any list.
    assertEquals(ViewContext.REVEAL, guardianService.contextFor(admin, kid));
    assertTrue(guardianService.canManageList(admin, kid));
  }

  @Test
  public void ownerViewingOwnListIsBlind() {
    assertEquals(ViewContext.BLIND, guardianService.contextFor(admin, admin));
  }

  @Test
  public void guardianTakesPrecedenceOverAdminBlindness() {
    // An admin who is also a parent must still see claim data on their kid's list.
    admin.setId(2L);
    link(kid, admin);
    assertEquals(ViewContext.GUARDIAN, guardianService.contextFor(admin, kid));
  }
}
