package com.giftpile.exception;

/** Thrown when the current user may not act on a resource; mapped to HTTP 403 by {@link ApiExceptionHandler}. */
public class ForbiddenException extends RuntimeException {
  public ForbiddenException(String message) {
    super(message);
  }
}
