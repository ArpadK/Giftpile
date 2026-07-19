package com.giftpile.service;

/**
 * Who is looking at a gift list, for visibility purposes. This is the single input that decides
 * both which gifts are shown and which claim data is exposed.
 *
 * <ul>
 *   <li>{@code BLIND} — the owner viewing their own list, or a non-manager admin editing it:
 *       every gift is shown, but no claim data is ever exposed.</li>
 *   <li>{@code REVEAL} — an ordinary viewer: claimed non-repeatable gifts are hidden and only the
 *       viewer's own claim is exposed.</li>
 *   <li>{@code GUARDIAN} — a parent viewing a kid they manage: every gift is shown and full claim
 *       data (who claimed, when) is exposed. This is the only context that bends the
 *       owner-blind invariant.</li>
 * </ul>
 */
public enum ViewContext {
  BLIND,
  REVEAL,
  GUARDIAN
}
