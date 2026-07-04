package com.giftpile.controller;

import com.giftpile.service.LinkPreviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Best-effort product-image lookup for a gift link. An empty imageUrl means "no image found". */
@RestController
@RequestMapping("/api/link-preview")
public class LinkPreviewController {
  private final LinkPreviewService linkPreviewService;

  public LinkPreviewController(LinkPreviewService linkPreviewService) {
    this.linkPreviewService = linkPreviewService;
  }

  @GetMapping
  public Map<String, String> getPreview(@RequestParam String url) {
    // Note: Spring has already URL-decoded the query parameter — do not decode again.
    // Invalid/internal URLs throw IllegalArgumentException → 400 via the ApiExceptionHandler.
    String imageUrl = linkPreviewService.fetchImageUrl(url);
    return Map.of("imageUrl", imageUrl != null ? imageUrl : "");
  }
}
