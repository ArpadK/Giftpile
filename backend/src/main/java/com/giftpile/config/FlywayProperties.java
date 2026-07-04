package com.giftpile.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Binds the spring.flyway.* properties we use to a typed object. */
@Component
class FlywayProperties {

  @Value("${spring.flyway.baseline-on-migrate:false}")
  private boolean baselineOnMigrate;

  @Value("${spring.flyway.baseline-version:1}")
  private String baselineVersion;

  boolean isBaselineOnMigrate() { return baselineOnMigrate; }
  String getBaselineVersion()   { return baselineVersion; }
}
