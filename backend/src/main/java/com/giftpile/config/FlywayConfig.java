package com.giftpile.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.Arrays;

/**
 * Runs Flyway migrations before Hibernate's EntityManagerFactory is initialized.
 *
 * Spring Boot 4 removed Flyway auto-configuration, so we wire it explicitly.
 * The static BeanFactoryPostProcessor adds "flyway" as a dependency of the
 * "entityManagerFactory" bean, which is what SB3's FlywayAutoConfiguration did internally.
 */
@Configuration
public class FlywayConfig {

  @Bean
  Flyway flyway(DataSource dataSource, FlywayProperties props) {
    Flyway flyway = Flyway.configure()
      .dataSource(dataSource)
      .baselineOnMigrate(props.isBaselineOnMigrate())
      .baselineVersion(props.getBaselineVersion())
      .load();
    flyway.migrate();
    return flyway;
  }

  @Bean
  FlywayProperties flywayProperties() {
    return new FlywayProperties();
  }

  /**
   * Forces the "entityManagerFactory" bean to depend on the "flyway" bean so the migration
   * runs before Hibernate uses the schema.
   * Must be static — BeanFactoryPostProcessors cannot be in non-static @Configuration inner classes.
   */
  @Bean
  static BeanFactoryPostProcessor flywayDependsOnPostProcessor() {
    return (ConfigurableListableBeanFactory beanFactory) -> {
      if (!beanFactory.containsBeanDefinition("entityManagerFactory")) return;
      BeanDefinition bd = beanFactory.getBeanDefinition("entityManagerFactory");
      String[] existing = bd.getDependsOn();
      if (existing != null && Arrays.asList(existing).contains("flyway")) return;
      String[] updated = existing == null
        ? new String[]{"flyway"}
        : Arrays.copyOf(existing, existing.length + 1);
      if (existing != null) updated[existing.length] = "flyway";
      bd.setDependsOn(updated);
    };
  }
}
