package com.giftpile.config;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

/**
 * Serves the built React SPA from the backend's static resources with a client-side routing
 * fallback: any request that does not map to a real static file (and is not an API call) resolves
 * to index.html, so deep links and refreshes on routes like /home or /admin/list/5 work instead
 * of returning 404.
 *
 * <p>REST endpoints are unaffected: {@code /api/**} controller mappings take precedence over the
 * resource handler, and unknown {@code /api/...} paths are explicitly left to 404 rather than
 * being served the SPA shell.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/**")
      .addResourceLocations("classpath:/static/")
      .resourceChain(true)
      .addResolver(new PathResourceResolver() {
        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
          Resource requested = location.createRelative(resourcePath);
          if (requested.exists() && requested.isReadable()) {
            return requested;
          }
          // Do not serve the SPA shell for unmatched API routes — let them 404 as JSON/HTTP.
          if (resourcePath.startsWith("api/")) {
            return null;
          }
          // SPA client-side route: fall back to the app shell.
          Resource index = new ClassPathResource("/static/index.html");
          return index.exists() ? index : null;
        }
      });
  }
}
