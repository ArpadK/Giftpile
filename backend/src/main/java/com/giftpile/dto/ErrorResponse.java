package com.giftpile.dto;

/** Uniform error body for all API errors; the frontend reads {@code message}. */
public record ErrorResponse(String message) {}
