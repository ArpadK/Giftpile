package com.giftpile.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.io.IOException;
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
  private static final int TIMEOUT_MS = 5_000;
  private static final int MAX_BODY_BYTES = 3 * 1024 * 1024; // 3 MB cap on fetched pages
  private static final int MAX_REDIRECTS = 5;

  // A browser-like User-Agent: many shops serve a stripped-down or blocked page to unknown bots.
  private static final String USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      + "Chrome/124.0.0.0 Safari/537.36";

  private static final ObjectMapper MAPPER = new ObjectMapper();

  // Meta tags to try, in priority order, for a preview image.
  private static final String[] META_SELECTORS = {
    "meta[property=og:image]",
    "meta[property=og:image:secure_url]",
    "meta[property=og:image:url]",
    "meta[name=og:image]",
    "meta[name=twitter:image]",
    "meta[name=twitter:image:src]",
    "meta[property=twitter:image]",
    "meta[itemprop=image]",
  };

  // Access-ordered LRU with a hard cap; synchronized because it is shared across request threads.
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
      Document doc = fetch(urlString);
      String imageUrl = extractImageUrl(doc);
      String result = (imageUrl == null || imageUrl.isBlank()) ? null : imageUrl;
      cache.put(urlString, new CacheEntry(result, System.currentTimeMillis()));
      return result;
    } catch (Exception e) {
      cache.put(urlString, new CacheEntry(null, System.currentTimeMillis()));
      return null;
    }
  }

  /**
   * Fetches the page, following redirects manually so each hop's host can be re-validated against
   * the SSRF blocklist (Jsoup's automatic redirect following would bypass that check).
   */
  private Document fetch(String urlString) throws IOException {
    String current = urlString;
    for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
      validatePublicHttpUrl(current);
      Connection.Response resp = Jsoup.connect(current)
        .userAgent(USER_AGENT)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9,nl;q=0.8")
        .timeout(TIMEOUT_MS)
        .maxBodySize(MAX_BODY_BYTES)
        .followRedirects(false)
        .ignoreHttpErrors(true)
        .execute();

      int code = resp.statusCode();
      if (code >= 300 && code < 400) {
        String location = resp.header("Location");
        if (location == null || location.isBlank()) {
          break;
        }
        current = URI.create(current).resolve(location.trim()).toString();
        continue;
      }
      return resp.parse();
    }
    throw new IOException("Too many redirects for " + urlString);
  }

  /**
   * Extracts a preview image URL from the document, trying (in order): Open Graph / Twitter /
   * itemprop meta tags, {@code <link rel=image_src>}, and JSON-LD product data. Relative URLs are
   * resolved against the page URL. Package-private for unit testing.
   */
  String extractImageUrl(Document doc) {
    for (String selector : META_SELECTORS) {
      String content = doc.select(selector).attr("content");
      if (content != null && !content.isBlank()) {
        return resolve(doc, content);
      }
    }

    String linkImage = doc.select("link[rel=image_src]").attr("abs:href");
    if (!linkImage.isBlank()) {
      return linkImage;
    }

    String jsonLdImage = extractFromJsonLd(doc);
    if (jsonLdImage != null && !jsonLdImage.isBlank()) {
      return resolve(doc, jsonLdImage);
    }

    return null;
  }

  private String extractFromJsonLd(Document doc) {
    for (Element script : doc.select("script[type=application/ld+json]")) {
      String json = script.html();
      if (json == null || json.isBlank()) {
        continue;
      }
      try {
        JsonNode root = MAPPER.readTree(json);
        String image = findImage(root);
        if (image != null && !image.isBlank()) {
          return image;
        }
      } catch (Exception ignored) {
        // Malformed JSON-LD block: skip it and try the next.
      }
    }
    return null;
  }

  /** Recursively searches a JSON-LD node tree for the first usable "image" value. */
  private String findImage(JsonNode node) {
    if (node == null) {
      return null;
    }
    if (node.isObject()) {
      String fromImage = imageUrlFromNode(node.get("image"));
      if (fromImage != null) {
        return fromImage;
      }
      for (JsonNode child : node) {
        String found = findImage(child);
        if (found != null) {
          return found;
        }
      }
    } else if (node.isArray()) {
      for (JsonNode element : node) {
        String found = findImage(element);
        if (found != null) {
          return found;
        }
      }
    }
    return null;
  }

  private String imageUrlFromNode(JsonNode image) {
    if (image == null) {
      return null;
    }
    if (image.isTextual()) {
      return blankToNull(image.asText());
    }
    if (image.isArray() && !image.isEmpty()) {
      return imageUrlFromNode(image.get(0));
    }
    if (image.isObject()) {
      for (String field : new String[] {"url", "contentUrl", "@id"}) {
        JsonNode value = image.get(field);
        if (value != null && value.isTextual()) {
          return blankToNull(value.asText());
        }
      }
    }
    return null;
  }

  private String blankToNull(String s) {
    return (s == null || s.isBlank()) ? null : s.trim();
  }

  private String resolve(Document doc, String url) {
    String trimmed = url.trim();
    try {
      String base = doc.baseUri();
      if (base != null && !base.isBlank()) {
        return URI.create(base).resolve(trimmed).toString();
      }
    } catch (Exception ignored) {
      // Fall through to returning the raw value.
    }
    return trimmed;
  }

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
