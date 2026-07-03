package com.giftpile.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  /**
   * Origins allowed to make credentialed (cookie-bearing) cross-origin requests.
   * Configurable via the {@code app.cors.allowed-origins} property (comma-separated)
   * so deployments can lock this down to their real front-end origin.
   */
  private final List<String> allowedOrigins;

  public SecurityConfig(
      @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:5174}") List<String> allowedOrigins) {
    this.allowedOrigins = allowedOrigins;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public DaoAuthenticationProvider authenticationProvider(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder);
    return provider;
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
  }

  /**
   * Explicit repository so controllers can persist the {@link org.springframework.security.core.context.SecurityContext}
   * into the HTTP session after a programmatic login. Since Spring Security 6 the context is no
   * longer saved automatically when set on the holder, so this is required for session auth to work.
   */
  @Bean
  public SecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    // Credentials must be allowed for cookie-based session auth; with credentials the origin
    // must be an explicit list (wildcard is rejected by the browser).
    configuration.setAllowedOrigins(allowedOrigins);
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      // CSRF is disabled because auth is session-cookie based for a same-site SPA and the
      // session cookie is SameSite=Lax + HttpOnly (see application.properties), which blocks
      // cross-site state-changing requests. Enable a token flow here if exposing cross-site.
      .csrf(csrf -> csrf.disable())
      .cors(cors -> cors.configurationSource(corsConfigurationSource()))
      .authorizeHttpRequests(authz -> authz
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        // Public, pre-login endpoints.
        .requestMatchers(HttpMethod.GET, "/api/auth/users").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/auth/users").permitAll() // bootstrap only; guarded in controller
        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/users").permitAll()
        // Admin-only endpoints.
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        // Everything else under /api requires authentication.
        .requestMatchers("/api/**").authenticated()
        .anyRequest().permitAll()
      )
      // Return 401 (not the default 403) for unauthenticated API requests so the SPA can
      // detect an expired/absent session and redirect to login.
      .exceptionHandling(ex -> ex.authenticationEntryPoint(
        (request, response, authException) -> response.sendError(401, "Unauthorized")));

    return http.build();
  }
}
