package com.giftpile.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class LinkPreviewService {
  private static final int CACHE_SIZE = 100;
  private static final long TTL_MS = 3_600_000; // 1 hour
  private static final int TIMEOUT_MS = 3_000;
  private static final int MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB cap on fetched pages

  // Access-ordered LRU with a hard cap; wrapped as synchronized because the cache is shared
  // across request threads and LinkedHashMap is not thread-safe.
  private final Map<String, CacheEntry> cache = Collections.synchronizedMap(
    new LinkedHashMap<String, CacheEntry>(CACHE_SIZE, 0.75f, true) {
      @Override
      protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> eldest) {
        return size() > CACHE_SIZE;
      }
    });

  public String fetchImageUrl(String urlString) {
    validatePublicHttpUrl(urlString);

    CacheEntry cached = cache.get(urlString);
    if (cached != null && System.currentTimeMillis() - cached.timestamp < TTL_MS) {
      return cached.imageUrl;
    }

    try {
      Document doc = Jsoup.connect(urlString)
        .userAgent("Giftpile/1.0")
        .timeout(TIMEOUT_MS)
        .maxBodySize(MAX_BODY_BYTES)
        // Do not follow redirects: a redirect to an internal address would bypass the
        // pre-request host validation (SSRF), and previews are best-effort anyway.
        .followRedirects(false)
        .get();

      String imageUrl = doc.select("meta[property=og:image]").attr("content");
      if (imageUrl.isEmpty()) {
        imageUrl = doc.select("meta[name=twitter:image]").attr("content");
      }

      String result = imageUrl.isEmpty() ? null : imageUrl;
      cache.put(urlString, new CacheEntry(result, System.currentTimeMillis()));
      return result;
    } catch (Exception e) {
      cache.put(urlString, new CacheEntry(null, System.currentTimeMillis()));
      return null;
    }
  }

  /**
   * Validates that the URL is an http(s) URL whose host resolves only to public, routable
   * addresses. Blocks loopback, link-local (incl. cloud metadata 169.254.169.254),
   * site-local/private, wildcard and multicast targets to prevent SSRF into the internal network.
   */
  private void validatePublicHttpUrl(String urlString) {
    URI uri;
    try {
      uri = URI.create(urlString);
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Invalid URL");
    }

    String scheme = uri.getScheme();
    if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
      throw new IllegalArgumentException("Invalid URL scheme");
    }

    String host = uri.getHost();
    if (host == null || host.isBlank()) {
      throw new IllegalArgumentException("Invalid URL host");
    }

    try {
      InetAddress[] addresses = InetAddress.getAllByName(host);
      for (InetAddress addr : addresses) {
        if (isBlockedAddress(addr)) {
          throw new IllegalArgumentException("Access to internal addresses is not allowed");
        }
      }
    } catch (UnknownHostException e) {
      throw new IllegalArgumentException("Host could not be resolved");
    }
  }

  private boolean isBlockedAddress(InetAddress addr) {
    return addr.isAnyLocalAddress()
      || addr.isLoopbackAddress()
      || addr.isLinkLocalAddress()
      || addr.isSiteLocalAddress()
      || addr.isMulticastAddress();
  }

  private static class CacheEntry {
    final String imageUrl;
    final long timestamp;

    CacheEntry(String imageUrl, long timestamp) {
      this.imageUrl = imageUrl;
      this.timestamp = timestamp;
    }
  }
}
