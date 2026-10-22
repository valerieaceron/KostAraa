-- Target: the supplied kostara-db export (MariaDB / MySQL with JSON support).
-- Review and run before deploying the updated business-profile API.
-- Existing support, usage analytics, admin, inventory and component unit enums already match.
-- No data is deleted, seeded, or reconstructed. Safe to run more than once.
SET @has_business_operations = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_profiles'
    AND COLUMN_NAME = 'business_operations'
);
SET @alignment_sql = IF(@has_business_operations = 0,
  'ALTER TABLE business_profiles ADD COLUMN business_operations JSON NULL AFTER monthly_sales_target_units',
  'SELECT ''business_operations already exists'' AS migration_status');
PREPARE alignment_statement FROM @alignment_sql;
EXECUTE alignment_statement;
DEALLOCATE PREPARE alignment_statement;

-- Match all frequencies offered by Business Settings and their monthly totals.
ALTER TABLE business_overhead_expenses
  MODIFY COLUMN expense_group ENUM('regular_monthly','annual_or_occasional','variable_monthly') NOT NULL DEFAULT 'regular_monthly',
  MODIFY COLUMN frequency ENUM('monthly','annual','daily','weekly','quarterly','semi_annual','one_time') NOT NULL DEFAULT 'monthly',
  MODIFY COLUMN monthly_equivalent DECIMAL(14,4) GENERATED ALWAYS AS (
    CASE frequency
      WHEN 'daily' THEN amount * 365 / 12
      WHEN 'weekly' THEN amount * 52 / 12
      WHEN 'quarterly' THEN amount / 3
      WHEN 'semi_annual' THEN amount / 6
      WHEN 'annual' THEN amount / 12
      WHEN 'one_time' THEN amount / 12
      ELSE amount
    END
  ) STORED;

-- Read-only verification: previously saved local operations cannot be backfilled
-- accurately from the database. Customers can save their settings after deployment.
SELECT COUNT(*) AS business_profiles, COUNT(business_operations) AS profiles_with_operations
FROM business_profiles WHERE deleted_at IS NULL;
SELECT COUNT(*) AS usage_sessions FROM user_usage_sessions;
SELECT feature_code, COUNT(*) AS feature_opens FROM feature_usage_events
WHERE event_name = 'feature_opened' GROUP BY feature_code;
SELECT issue_type, status, COUNT(*) AS tickets FROM beta_support_reports
WHERE deleted_at IS NULL GROUP BY issue_type, status;
