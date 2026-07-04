package com.giftpile.exception;

/** Thrown when a requested resource does not exist; mapped to HTTP 404 by {@link ApiExceptionHandler}. */
public class NotFoundException extends RuntimeException {
  public NotFoundException(String message) {
    super(message);
  }
}
