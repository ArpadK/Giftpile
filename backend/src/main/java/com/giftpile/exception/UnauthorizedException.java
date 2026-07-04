package com.giftpile.exception;

/** Thrown when no authenticated user is available; mapped to HTTP 401 by {@link ApiExceptionHandler}. */
public class UnauthorizedException extends RuntimeException {
  public UnauthorizedException(String message) {
    super(message);
  }
}
