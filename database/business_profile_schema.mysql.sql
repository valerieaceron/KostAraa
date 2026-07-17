-- Kostaraa Business Profile schema
-- Target database: MySQL 8.0+
-- Dependency: users(id)
--
-- This schema is the main source for:
--   Inventory ownership
--   Calculator labor and operation costs
--   Product Library account ownership
--   Business-health and future Araa recommendations


CREATE TABLE business_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,

    -- Business identity
    business_name VARCHAR(180) NOT NULL,
    business_description TEXT NULL,
    business_category ENUM(
        'food_and_beverage',
        'handmade_and_crafts',
        'customized_products',
        'retail_and_ecommerce',
        'small_scale_manufacturing',
        'other_product_business'
    ) NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'PH',
    currency_code CHAR(3) NOT NULL DEFAULT 'PHP',
    province_or_city VARCHAR(150) NULL,

    -- Business stage
    business_stage ENUM(
        'still_planning',
        'newly_operating',
        'operating_and_growing',
        'operating_breaking_even',
        'operating_but_struggling',
        'temporarily_inactive',
        'previously_operated'
    ) NULL,
    year_started SMALLINT UNSIGNED NULL,
    planned_start_year SMALLINT UNSIGNED NULL,

    -- Global sales target used by Calculator
    monthly_sales_target_units DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,

    -- Profile state
    setup_status ENUM('not_started', 'draft', 'complete')
        NOT NULL DEFAULT 'not_started',
    onboarding_step TINYINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_business_profile_user (user_id),
    KEY idx_business_profile_status (setup_status, deleted_at),
    KEY idx_business_profile_category (business_category),

    CONSTRAINT chk_business_profile_name
        CHECK (CHAR_LENGTH(TRIM(business_name)) > 0),
    CONSTRAINT chk_business_profile_onboarding_step
        CHECK (onboarding_step BETWEEN 1 AND 8),
    CONSTRAINT chk_business_profile_year_started
        CHECK (year_started IS NULL OR year_started BETWEEN 1900 AND 2200),
    CONSTRAINT chk_business_profile_planned_year
        CHECK (planned_start_year IS NULL OR planned_start_year BETWEEN 1900 AND 2200),

    CONSTRAINT fk_business_profile_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Employees, family members, freelancers, and owner work records.
CREATE TABLE business_manpower (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_profile_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    name_or_role VARCHAR(150) NOT NULL,
    position_name VARCHAR(150) NULL,
    employment_type ENUM(
        'owner',
        'family_member',
        'full_time_employee',
        'part_time_employee',
        'freelancer',
        'contractual_worker'
    ) NOT NULL,
    labor_classification ENUM('direct_labor', 'indirect_labor') NOT NULL,
    pay_type ENUM('monthly', 'daily', 'hourly', 'project')
        NOT NULL DEFAULT 'monthly',
    pay_amount DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    working_days_per_month DECIMAL(7, 2) UNSIGNED NOT NULL DEFAULT 0,
    working_hours_per_day DECIMAL(7, 2) UNSIGNED NOT NULL DEFAULT 0,
    benefits_and_allowances DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    employer_contributions DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    production_time_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    KEY idx_business_manpower_profile (business_profile_id, is_active, deleted_at),
    KEY idx_business_manpower_user (user_id),
    KEY idx_business_manpower_classification (business_profile_id, labor_classification),

    CONSTRAINT chk_business_manpower_production_percentage
        CHECK (production_time_percentage BETWEEN 0 AND 100),
    CONSTRAINT fk_business_manpower_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_business_manpower_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Owner compensation preference is separate from employee/manpower rows.
CREATE TABLE business_owner_labor (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_profile_id BIGINT UNSIGNED NOT NULL,
    include_owner_pay BOOLEAN NOT NULL DEFAULT FALSE,
    owner_pay_status ENUM('included', 'not_included', 'estimate_later')
        NOT NULL DEFAULT 'not_included',
    desired_monthly_owner_pay DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    working_hours_per_month DECIMAL(9, 2) UNSIGNED NOT NULL DEFAULT 0,
    production_time_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    management_time_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_owner_labor_profile (business_profile_id),

    CONSTRAINT chk_owner_production_percentage
        CHECK (production_time_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_owner_management_percentage
        CHECK (management_time_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_owner_total_percentage
        CHECK (production_time_percentage + management_time_percentage <= 100),
    CONSTRAINT fk_owner_labor_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Regular monthly and annual/occasional business bills.
CREATE TABLE business_overhead_expenses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_profile_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    expense_name VARCHAR(180) NOT NULL,
    expense_category ENUM(
        'rent_and_space',
        'utilities',
        'internet_and_communication',
        'staff_and_admin_pay',
        'marketing_and_promotions',
        'software_and_subscriptions',
        'permits_licenses_government_fees',
        'professional_services',
        'repairs_and_maintenance',
        'office_and_store_supplies',
        'transportation_and_business_travel',
        'bank_and_payment_fees',
        'insurance',
        'equipment_and_tools',
        'other_business_expense'
    ) NOT NULL,
    expense_group ENUM('regular_monthly', 'annual_or_occasional')
        NOT NULL DEFAULT 'regular_monthly',
    amount DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    frequency ENUM('monthly', 'annual') NOT NULL DEFAULT 'monthly',
    monthly_equivalent DECIMAL(14, 4)
        GENERATED ALWAYS AS (
            CASE WHEN frequency = 'annual' THEN amount / 12 ELSE amount END
        ) STORED,
    start_date DATE NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    KEY idx_business_overhead_profile (business_profile_id, is_active, deleted_at),
    KEY idx_business_overhead_user (user_id),
    KEY idx_business_overhead_category (business_profile_id, expense_category),

    CONSTRAINT chk_business_overhead_name
        CHECK (CHAR_LENGTH(TRIM(expense_name)) > 0),
    CONSTRAINT chk_business_overhead_amount
        CHECK (amount >= 0),
    CONSTRAINT fk_business_overhead_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_business_overhead_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Simplified target-market answers from onboarding Step 5.
CREATE TABLE business_target_market (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_profile_id BIGINT UNSIGNED NOT NULL,
    customer_groups JSON NULL,
    most_frequent_customer_group VARCHAR(100) NULL,
    typical_age_group VARCHAR(50) NULL,
    customer_location_type VARCHAR(100) NULL,
    main_city_or_area VARCHAR(150) NULL,
    usual_spending_per_order DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    purchase_frequency VARCHAR(100) NULL,
    buying_reasons JSON NULL,
    price_sensitivity VARCHAR(80) NULL,
    willingness_to_pay DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    customer_priorities JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_target_market_profile (business_profile_id),
    CONSTRAINT fk_target_market_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Pricing-preference answers are retained for future recommendations even if
-- the Pricing Strategy card is hidden from the Business Profile summary UI.
CREATE TABLE business_pricing_preferences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_profile_id BIGINT UNSIGNED NOT NULL,
    pricing_decision_methods JSON NULL,
    desired_price_position ENUM('affordable', 'good_value', 'premium', 'not_sure')
        NOT NULL DEFAULT 'not_sure',
    lowest_usual_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    highest_usual_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    profit_plan ENUM('recommended', 'has_profit_target')
        NOT NULL DEFAULT 'recommended',
    desired_profit_margin DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    discount_practice VARCHAR(100) NULL,
    biggest_discount VARCHAR(50) NULL,
    selling_type ENUM('retail_only', 'wholesale_only', 'retail_and_wholesale', 'not_sure')
        NOT NULL DEFAULT 'not_sure',
    usual_retail_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    usual_wholesale_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    minimum_wholesale_order DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_pricing_preference_profile (business_profile_id),

    CONSTRAINT chk_pricing_preference_margin
        CHECK (desired_profit_margin BETWEEN 0 AND 100),
    CONSTRAINT chk_pricing_preference_range
        CHECK (highest_usual_price = 0 OR highest_usual_price >= lowest_usual_price),
    CONSTRAINT fk_pricing_preference_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Selected selling channels and their channel-specific costs.
CREATE TABLE business_sales_channels (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_profile_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    commission_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    transaction_fee_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    listing_fee DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    delivery_subsidy DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    advertising_cost DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    refund_allowance DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    other_costs DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    packaging_requirement VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_channel_profile_name (business_profile_id, channel_name),
    KEY idx_sales_channel_user (user_id),

    CONSTRAINT chk_sales_channel_commission
        CHECK (commission_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_sales_channel_transaction_fee
        CHECK (transaction_fee_percentage BETWEEN 0 AND 100),
    CONSTRAINT fk_sales_channel_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_sales_channel_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Monthly totals used by the Calculator can be obtained with these queries:
--
-- Total labor cost:
-- SELECT
--     COALESCE(SUM(pay_amount + benefits_and_allowances + employer_contributions), 0)
-- FROM business_manpower
-- WHERE business_profile_id = ? AND is_active = TRUE AND deleted_at IS NULL;
--
-- Total monthly overhead:
-- SELECT COALESCE(SUM(monthly_equivalent), 0)
-- FROM business_overhead_expenses
-- WHERE business_profile_id = ? AND is_active = TRUE AND deleted_at IS NULL;
--
-- Calculator cost per item:
-- Total labor cost / business_profiles.monthly_sales_target_units
-- Total monthly overhead / business_profiles.monthly_sales_target_units


-- Current React-to-database mapping:
-- profile.identity                         -> business_profiles
-- profile.businessStage                    -> business_profiles
-- profile.operations.monthlySalesUnits     -> business_profiles.monthly_sales_target_units
-- profile.manpower[]                       -> business_manpower
-- profile.ownerLabor                       -> business_owner_labor
-- profile.overhead.fixed[]                 -> business_overhead_expenses (regular_monthly)
-- profile.overhead.periodic[]              -> business_overhead_expenses (annual_or_occasional)
-- profile.targetMarket                     -> business_target_market
-- profile.pricingStrategy                  -> business_pricing_preferences
-- profile.salesChannels[]                  -> business_sales_channels
