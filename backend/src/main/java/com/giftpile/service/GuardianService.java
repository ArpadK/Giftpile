package com.giftpile.service;

import com.giftpile.entity.User;
import com.giftpile.repository.KidManagerRepository;
import org.springframework.stereotype.Service;

/**
 * Resolves the parent/guardian relationship between a viewer and a list owner, and turns it into
 * the {@link ViewContext} used everywhere gift visibility is computed. Keeping this in one place
 * ensures the guardian carve-out to the owner-blind invariant is applied consistently.
 */
@Service
public class GuardianService {
  private final KidManagerRepository kidManagerRepository;

  public GuardianService(KidManagerRepository kidManagerRepository) {
    this.kidManagerRepository = kidManagerRepository;
  }

  /** True when {@code viewer} is an assigned parent of the kid {@code owner}. */
  public boolean isGuardianOf(User viewer, User owner) {
    if (viewer == null || owner == null || !Boolean.TRUE.equals(owner.getIsKid())) {
      return false;
    }
    return kidManagerRepository.existsByKidUserIdAndManagerUserId(owner.getId(), viewer.getId());
  }

  /**
   * True when {@code viewer} may edit {@code owner}'s list: the owner themselves, any admin, or a
   * guardian of a kid owner.
   */
  public boolean canManageList(User viewer, User owner) {
    return viewer.getId().equals(owner.getId())
      || Boolean.TRUE.equals(viewer.getIsAdmin())
      || isGuardianOf(viewer, owner);
  }

  /**
   * The visibility context for {@code viewer} looking at {@code owner}'s list. Guardian takes
   * precedence so a parent who is also an admin still sees claims. Only the owner viewing their
   * own list is blind here; admin-edit blindness is served by the dedicated admin endpoint, so an
   * admin browsing the family list is an ordinary reveal viewer (and can still claim/gift).
   */
  public ViewContext contextFor(User viewer, User owner) {
    if (isGuardianOf(viewer, owner)) {
      return ViewContext.GUARDIAN;
    }
    if (viewer.getId().equals(owner.getId())) {
      return ViewContext.BLIND;
    }
    return ViewContext.REVEAL;
  }
}
