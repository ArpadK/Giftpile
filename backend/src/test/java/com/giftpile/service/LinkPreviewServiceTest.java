package com.giftpile.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("LinkPreviewService Unit Tests")
public class LinkPreviewServiceTest {

  private LinkPreviewService service;
  private static final String BASE = "https://shop.example.com/product/123";

  @BeforeEach
  public void setUp() {
    service = new LinkPreviewService();
  }

  private String extract(String headHtml) {
    Document doc = Jsoup.parse("<html><head>" + headHtml + "</head><body></body></html>", BASE);
    return service.extractImageUrl(doc);
  }

  // ============= URL validation (runs before any network access) =============

  @Test
  @DisplayName("Should reject URLs with invalid scheme (ftp)")
  public void testRejectFtpScheme() {
    IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
      () -> service.fetchImageUrl("ftp://example.com/page"));
    assertEquals("Invalid URL scheme", ex.getMessage());
  }

  @Test
  @DisplayName("Should reject URLs with no scheme")
  public void testRejectUrlWithoutScheme() {
    assertThrows(IllegalArgumentException.class, () -> service.fetchImageUrl("example.com/page"));
  }

  @Test
  @DisplayName("Should reject mailto scheme")
  public void testRejectCustomScheme() {
    IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
      () -> service.fetchImageUrl("mailto:test@example.com"));
    assertEquals("Invalid URL scheme", ex.getMessage());
  }

  @Test
  @DisplayName("Should reject localhost / loopback / private hosts (SSRF)")
  public void testRejectInternalHosts() {
    assertEquals("Access to internal addresses is not allowed",
      assertThrows(IllegalArgumentException.class,
        () -> service.fetchImageUrl("http://localhost:8080/page")).getMessage());
    assertEquals("Access to internal addresses is not allowed",
      assertThrows(IllegalArgumentException.class,
        () -> service.fetchImageUrl("http://127.0.0.1/page")).getMessage());
    assertEquals("Access to internal addresses is not allowed",
      assertThrows(IllegalArgumentException.class,
        () -> service.fetchImageUrl("http://192.168.1.10/page")).getMessage());
    assertEquals("Access to internal addresses is not allowed",
      assertThrows(IllegalArgumentException.class,
        () -> service.fetchImageUrl("http://10.0.0.5/page")).getMessage());
    // Cloud metadata endpoint is link-local and must be blocked too.
    assertEquals("Access to internal addresses is not allowed",
      assertThrows(IllegalArgumentException.class,
        () -> service.fetchImageUrl("http://169.254.169.254/latest/meta-data")).getMessage());
  }

  // ============= Image extraction =============

  @Test
  @DisplayName("Extracts og:image")
  public void testOgImage() {
    assertEquals("https://cdn.example.com/og.jpg",
      extract("<meta property=\"og:image\" content=\"https://cdn.example.com/og.jpg\">"));
  }

  @Test
  @DisplayName("og:image takes precedence over twitter:image")
  public void testOgPrecedence() {
    String html = "<meta name=\"twitter:image\" content=\"https://cdn.example.com/tw.jpg\">"
      + "<meta property=\"og:image\" content=\"https://cdn.example.com/og.jpg\">";
    assertEquals("https://cdn.example.com/og.jpg", extract(html));
  }

  @Test
  @DisplayName("Falls back to twitter:image when no og:image")
  public void testTwitterFallback() {
    assertEquals("https://cdn.example.com/tw.jpg",
      extract("<meta name=\"twitter:image\" content=\"https://cdn.example.com/tw.jpg\">"));
  }

  @Test
  @DisplayName("Falls back to itemprop=image")
  public void testItempropFallback() {
    assertEquals("https://cdn.example.com/item.jpg",
      extract("<meta itemprop=\"image\" content=\"https://cdn.example.com/item.jpg\">"));
  }

  @Test
  @DisplayName("Falls back to link rel=image_src")
  public void testLinkImageSrc() {
    assertEquals("https://cdn.example.com/link.jpg",
      extract("<link rel=\"image_src\" href=\"https://cdn.example.com/link.jpg\">"));
  }

  @Test
  @DisplayName("Resolves a relative og:image against the page URL")
  public void testRelativeResolution() {
    assertEquals("https://shop.example.com/img/p.jpg",
      extract("<meta property=\"og:image\" content=\"/img/p.jpg\">"));
  }

  @Test
  @DisplayName("Extracts JSON-LD product image (string)")
  public void testJsonLdString() {
    String html = "<script type=\"application/ld+json\">"
      + "{\"@type\":\"Product\",\"name\":\"Thing\",\"image\":\"https://cdn.example.com/ld.jpg\"}"
      + "</script>";
    assertEquals("https://cdn.example.com/ld.jpg", extract(html));
  }

  @Test
  @DisplayName("Extracts JSON-LD product image (array)")
  public void testJsonLdArray() {
    String html = "<script type=\"application/ld+json\">"
      + "{\"@type\":\"Product\",\"image\":[\"https://cdn.example.com/a.jpg\",\"https://cdn.example.com/b.jpg\"]}"
      + "</script>";
    assertEquals("https://cdn.example.com/a.jpg", extract(html));
  }

  @Test
  @DisplayName("Extracts JSON-LD product image (object with url)")
  public void testJsonLdObject() {
    String html = "<script type=\"application/ld+json\">"
      + "{\"@type\":\"Product\",\"image\":{\"@type\":\"ImageObject\",\"url\":\"https://cdn.example.com/o.jpg\"}}"
      + "</script>";
    assertEquals("https://cdn.example.com/o.jpg", extract(html));
  }

  @Test
  @DisplayName("Extracts JSON-LD image nested in @graph")
  public void testJsonLdGraph() {
    String html = "<script type=\"application/ld+json\">"
      + "{\"@graph\":[{\"@type\":\"WebSite\"},{\"@type\":\"Product\",\"image\":\"https://cdn.example.com/g.jpg\"}]}"
      + "</script>";
    assertEquals("https://cdn.example.com/g.jpg", extract(html));
  }

  @Test
  @DisplayName("Skips malformed JSON-LD and still finds a meta image")
  public void testMalformedJsonLdIgnored() {
    String html = "<script type=\"application/ld+json\">{ not valid json }</script>"
      + "<meta property=\"og:image\" content=\"https://cdn.example.com/og.jpg\">";
    assertEquals("https://cdn.example.com/og.jpg", extract(html));
  }

  @Test
  @DisplayName("Returns null when no image is present")
  public void testNoImage() {
    assertNull(extract("<title>No image here</title>"));
  }
}
