package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Statement;

/**
 * Widens the gifts.link column to TEXT on Postgres databases that were created before Flyway
 * was introduced (when ddl-auto=update caused Hibernate to generate VARCHAR(255) for the column).
 *
 * V1__init.sql already declares link as TEXT for fresh installs, so this is only a fix-up for
 * old databases. SQLite treats VARCHAR(255) as TEXT internally (no length enforcement), so no
 * migration is needed there.
 */
public class V4__widen_link_column extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        String db = context.getConnection().getMetaData().getDatabaseProductName().toLowerCase();
        if (db.contains("postgresql") || db.contains("postgres")) {
            try (Statement stmt = context.getConnection().createStatement()) {
                stmt.execute("ALTER TABLE gifts ALTER COLUMN link TYPE TEXT");
            }
        }
    }
}
