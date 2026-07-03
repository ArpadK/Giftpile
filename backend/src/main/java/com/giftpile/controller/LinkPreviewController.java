package com.giftpile.controller;

import com.giftpile.service.LinkPreviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/link-preview")
public class LinkPreviewController {
  private final LinkPreviewService linkPreviewService;

  public LinkPreviewController(LinkPreviewService linkPreviewService) {
    this.linkPreviewService = linkPreviewService;
  }

  @GetMapping
  public ResponseEntity<?> getPreview(@RequestParam String url) {
    try {
      String decodedUrl = URLDecoder.decode(url, StandardCharsets.UTF_8);
      String imageUrl = linkPreviewService.fetchImageUrl(decodedUrl);
      return ResponseEntity.ok(Map.of("imageUrl", imageUrl != null ? imageUrl : ""));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
    } catch (Exception e) {
      return ResponseEntity.ok(Map.of("imageUrl", ""));
    }
  }
}
