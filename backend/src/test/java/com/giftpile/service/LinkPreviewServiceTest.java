package com.giftpile.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.MockedStatic;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("LinkPreviewService Unit Tests")
public class LinkPreviewServiceTest {

  private LinkPreviewService linkPreviewService;

  @BeforeEach
  public void setUp() {
    linkPreviewService = new LinkPreviewService();
  }

  // ============= URL Scheme Validation Tests =============

  @Test
  @DisplayName("Should reject URLs with invalid scheme (ftp)")
  public void testRejectFtpScheme() {
    String ftpUrl = "ftp://example.com/page";

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> linkPreviewService.fetchImageUrl(ftpUrl)
    );

    assertEquals("Invalid URL scheme", exception.getMessage());
  }

  @Test
  @DisplayName("Should reject URLs with no scheme")
  public void testRejectUrlWithoutScheme() {
    String urlWithoutScheme = "example.com/page";

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> linkPreviewService.fetchImageUrl(urlWithoutScheme)
    );

    assertEquals("Invalid URL scheme", exception.getMessage());
  }

  @Test
  @DisplayName("Should reject URLs with custom scheme (mailto, file, etc)")
  public void testRejectCustomScheme() {
    String mailtoUrl = "mailto:test@example.com";

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> linkPreviewService.fetchImageUrl(mailtoUrl)
    );

    assertEquals("Invalid URL scheme", exception.getMessage());
  }

  // ============= Private IP Blocking Tests =============

  @Test
  @DisplayName("Should reject localhost addresses")
  public void testRejectLocalhost() {
    String localhostUrl = "http://localhost:8080/page";

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> linkPreviewService.fetchImageUrl(localhostUrl)
    );

    assertEquals("Access to internal addresses is not allowed", exception.getMessage());
  }

  @Test
  @DisplayName("Should reject 127.0.0.1 loopback")
  public void testRejectLoopback() {
    String loopbackUrl = "http://127.0.0.1:3000/page";

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> linkPreviewService.fetchImageUrl(loopbackUrl)
    );

    assertEquals("Access to internal addresses is not allowed", exception.getMessage());
  }

  @Test
  @DisplayName("Should reject 192.168.x.x private IPs")
  public void testRejectPrivate192Range() {
    String privateUrl = "http://192.168.1.100/page";

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> linkPreviewService.fetchImageUrl(privateUrl)
    );

    assertEquals("Access to internal addresses is not allowed", exception.getMessage());
  }

  @Test
  @DisplayName("Should reject 10.0.x.x private IPs")
  public void testRejectPrivate10Range() {
    String privateUrl = "http://10.0.0.50/page";

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> linkPreviewService.fetchImageUrl(privateUrl)
    );

    assertEquals("Access to internal addresses is not allowed", exception.getMessage());
  }

  // ============= Valid URL Parsing Tests =============

  @Test
  @DisplayName("Should parse og:image from valid HTTPS URL")
  public void testValidHttpsUrlParsesOgImage() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";
      String expectedImageUrl = "https://example.com/og-image.jpg";

      Document mockDocument = mock(Document.class);
      Elements ogImageElements = mock(Elements.class);

      when(ogImageElements.attr("content")).thenReturn(expectedImageUrl);
      when(mockDocument.select("meta[property=og:image]")).thenReturn(ogImageElements);
      when(mockDocument.select("meta[name=twitter:image]")).thenReturn(new Elements());

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenReturn(mockDocument);

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      String result = linkPreviewService.fetchImageUrl(testUrl);

      assertEquals(expectedImageUrl, result);
    }
  }

  @Test
  @DisplayName("Should parse og:image from valid HTTP URL")
  public void testValidHttpUrlParsesOgImage() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "http://example.com/article";
      String expectedImageUrl = "http://example.com/image.png";

      Document mockDocument = mock(Document.class);
      Elements ogImageElements = mock(Elements.class);

      when(ogImageElements.attr("content")).thenReturn(expectedImageUrl);
      when(mockDocument.select("meta[property=og:image]")).thenReturn(ogImageElements);
      when(mockDocument.select("meta[name=twitter:image]")).thenReturn(new Elements());

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenReturn(mockDocument);

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      String result = linkPreviewService.fetchImageUrl(testUrl);

      assertEquals(expectedImageUrl, result);
    }
  }

  // ============= Fallback to twitter:image Tests =============

  @Test
  @DisplayName("Should fallback to twitter:image when og:image is empty")
  public void testFallbackToTwitterImage() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";
      String expectedImageUrl = "https://example.com/twitter-image.jpg";

      Document mockDocument = mock(Document.class);
      Elements emptyOgImageElements = mock(Elements.class);
      Elements twitterImageElements = mock(Elements.class);

      when(emptyOgImageElements.attr("content")).thenReturn("");
      when(twitterImageElements.attr("content")).thenReturn(expectedImageUrl);
      when(mockDocument.select("meta[property=og:image]")).thenReturn(emptyOgImageElements);
      when(mockDocument.select("meta[name=twitter:image]")).thenReturn(twitterImageElements);

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenReturn(mockDocument);

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      String result = linkPreviewService.fetchImageUrl(testUrl);

      assertEquals(expectedImageUrl, result);
    }
  }

  @Test
  @DisplayName("Should return null when both og:image and twitter:image are empty")
  public void testReturnNullWhenBothMetaTagsEmpty() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";

      Document mockDocument = mock(Document.class);
      Elements emptyElements = mock(Elements.class);

      when(emptyElements.attr("content")).thenReturn("");
      when(mockDocument.select("meta[property=og:image]")).thenReturn(emptyElements);
      when(mockDocument.select("meta[name=twitter:image]")).thenReturn(emptyElements);

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenReturn(mockDocument);

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      String result = linkPreviewService.fetchImageUrl(testUrl);

      assertNull(result);
    }
  }

  // ============= Fetch Failure Tests =============

  @Test
  @DisplayName("Should return null when Jsoup.connect throws exception")
  public void testReturnNullOnFetchFailure() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenThrow(new RuntimeException("Network error"));

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      String result = linkPreviewService.fetchImageUrl(testUrl);

      assertNull(result);
    }
  }

  @Test
  @DisplayName("Should return null when connection times out")
  public void testReturnNullOnConnectionTimeout() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenThrow(new java.net.SocketTimeoutException("Timeout"));

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      String result = linkPreviewService.fetchImageUrl(testUrl);

      assertNull(result);
    }
  }

  @Test
  @DisplayName("Should return null when URL returns invalid content")
  public void testReturnNullOnInvalidContent() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenThrow(new org.jsoup.HttpStatusException("404", 404, "Not Found"));

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      String result = linkPreviewService.fetchImageUrl(testUrl);

      assertNull(result);
    }
  }

  // ============= Caching Tests =============

  @Test
  @DisplayName("Should cache successful fetch results")
  public void testCacheSuccessfulResults() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";
      String expectedImageUrl = "https://example.com/image.jpg";

      Document mockDocument = mock(Document.class);
      Elements ogImageElements = mock(Elements.class);

      when(ogImageElements.attr("content")).thenReturn(expectedImageUrl);
      when(mockDocument.select("meta[property=og:image]")).thenReturn(ogImageElements);
      when(mockDocument.select("meta[name=twitter:image]")).thenReturn(new Elements());

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenReturn(mockDocument);

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      // First call
      String result1 = linkPreviewService.fetchImageUrl(testUrl);
      assertEquals(expectedImageUrl, result1);

      // Second call should use cache (no network call)
      String result2 = linkPreviewService.fetchImageUrl(testUrl);
      assertEquals(expectedImageUrl, result2);

      // Verify Jsoup.connect was only called once (cached on second call)
      jsoupMock.verify(() -> Jsoup.connect(testUrl), times(1));
    }
  }

  @Test
  @DisplayName("Should cache null results for failed fetches")
  public void testCacheNullResults() throws IOException {
    try (MockedStatic<Jsoup> jsoupMock = mockStatic(Jsoup.class)) {
      String testUrl = "https://example.com/article";

      org.jsoup.Connection mockConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection userAgentConnection = mock(org.jsoup.Connection.class);
      org.jsoup.Connection timeoutConnection = mock(org.jsoup.Connection.class);

      when(mockConnection.userAgent("Giftpile/1.0")).thenReturn(userAgentConnection);
      when(userAgentConnection.timeout(3000)).thenReturn(timeoutConnection);
      when(timeoutConnection.maxBodySize(anyInt())).thenReturn(timeoutConnection);
      when(timeoutConnection.followRedirects(anyBoolean())).thenReturn(timeoutConnection);
      when(timeoutConnection.get()).thenThrow(new RuntimeException("Network error"));

      jsoupMock.when(() -> Jsoup.connect(testUrl)).thenReturn(mockConnection);

      // First call
      String result1 = linkPreviewService.fetchImageUrl(testUrl);
      assertNull(result1);

      // Second call should use cache
      String result2 = linkPreviewService.fetchImageUrl(testUrl);
      assertNull(result2);

      // Verify Jsoup.connect was only called once
      jsoupMock.verify(() -> Jsoup.connect(testUrl), times(1));
    }
  }
}
