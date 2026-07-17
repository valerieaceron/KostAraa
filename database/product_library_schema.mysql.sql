-- Kostaraa Product Library schema
-- Target database: MySQL 8.0+
-- Dependencies:
--   users(id)
--   business_profiles(id)
--   inventory_items(id) from inventory_schema.mysql.sql


-- One row represents one saved Product or Service in the user's library.
CREATE TABLE product_library_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    business_profile_id BIGINT UNSIGNED NULL,
    duplicated_from_id BIGINT UNSIGNED NULL,

    -- Library identity
    item_name VARCHAR(180) NOT NULL,
    item_type ENUM('product', 'service') NOT NULL DEFAULT 'product',
    category VARCHAR(100) NOT NULL DEFAULT 'Other',
    sku VARCHAR(80) NULL,
    status ENUM('draft', 'active', 'needs_review', 'archived')
        NOT NULL DEFAULT 'draft',
    notes TEXT NULL,

    -- User-entered costing and sales targets
    current_selling_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    target_profit_margin DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    expected_monthly_sales DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    currency_code CHAR(3) NOT NULL DEFAULT 'PHP',

    -- Other per-item costs used by the Calculator
    packaging_addon_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    platform_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    marketing_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    other_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,

    -- Optional product-level override of Business Profile defaults
    use_operation_cost_override BOOLEAN NOT NULL DEFAULT FALSE,
    labor_cost_override_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    overhead_cost_override_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,

    -- Latest calculated pricing result.
    -- These values are snapshots and should be recalculated when inputs change.
    material_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    packaging_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    labor_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    overhead_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    total_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    suggested_selling_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    gross_profit_per_unit DECIMAL(14, 4) NOT NULL DEFAULT 0,
    gross_margin_percentage DECIMAL(7, 4) NOT NULL DEFAULT 0,
    markup_percentage DECIMAL(7, 4) NOT NULL DEFAULT 0,
    break_even_selling_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    break_even_units DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    pricing_health ENUM('healthy', 'warning', 'risky', 'needs_review', 'not_checked')
        NOT NULL DEFAULT 'not_checked',

    -- Pricing controls from the Calculator
    marketing_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    markup_topup_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    tax_mode ENUM('vat', 'percentage', 'exempt', 'income8', 'custom')
        NOT NULL DEFAULT 'exempt',
    tax_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    tax_amount_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,

    -- Explanation data displayed in the Product Library detail view
    red_flags JSON NULL,
    calculation_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    last_calculated_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_product_library_user_sku (user_id, sku),
    KEY idx_product_library_user_status (user_id, status, deleted_at),
    KEY idx_product_library_business (business_profile_id),
    KEY idx_product_library_name (user_id, item_name),
    KEY idx_product_library_category (user_id, category),
    KEY idx_product_library_health (user_id, pricing_health),

    CONSTRAINT chk_product_library_name
        CHECK (CHAR_LENGTH(TRIM(item_name)) > 0),
    CONSTRAINT chk_product_target_margin
        CHECK (target_profit_margin BETWEEN 0 AND 100),
    CONSTRAINT chk_product_tax_percentage
        CHECK (tax_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_product_marketing_percentage
        CHECK (marketing_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_product_markup_topup
        CHECK (markup_topup_percentage >= 0),

    CONSTRAINT fk_product_library_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_product_library_business
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_product_library_duplicate_source
        FOREIGN KEY (duplicated_from_id) REFERENCES product_library_items(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Ingredients and packaging used by each saved item.
-- `inventory_item_id` links the row to the Inventory table. The name and cost
-- snapshot remain here so an old costing does not silently change when an
-- Inventory material is renamed or repriced.
CREATE TABLE product_library_components (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_library_item_id BIGINT UNSIGNED NOT NULL,
    inventory_item_id BIGINT UNSIGNED NULL,
    component_type ENUM('material', 'packaging') NOT NULL,
    component_name VARCHAR(180) NOT NULL,
    used_quantity DECIMAL(14, 4) UNSIGNED NOT NULL,
    used_unit ENUM('ml', 'g', 'pcs') NOT NULL,
    inventory_unit_cost_snapshot DECIMAL(18, 6) UNSIGNED NOT NULL DEFAULT 0,
    computed_cost_per_product DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_product_component_product (product_library_item_id, component_type, sort_order),
    KEY idx_product_component_inventory (inventory_item_id),

    CONSTRAINT chk_product_component_name
        CHECK (CHAR_LENGTH(TRIM(component_name)) > 0),
    CONSTRAINT chk_product_component_quantity
        CHECK (used_quantity > 0),
    CONSTRAINT fk_product_component_product
        FOREIGN KEY (product_library_item_id) REFERENCES product_library_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_product_component_inventory
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Optional calculation history. This preserves previous results whenever the
-- user recalculates or updates a library item.
CREATE TABLE product_costing_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_library_item_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    input_snapshot JSON NOT NULL,
    result_snapshot JSON NOT NULL,
    calculation_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_product_costing_history_item (product_library_item_id, calculated_at),
    KEY idx_product_costing_history_user (user_id, calculated_at),

    CONSTRAINT fk_product_costing_history_item
        FOREIGN KEY (product_library_item_id) REFERENCES product_library_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_product_costing_history_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Current React-to-database mapping:
-- savedItem.id                         -> product_library_items.id
-- savedItem.productName                -> product_library_items.item_name
-- savedItem.itemType                   -> product_library_items.item_type
-- savedItem.category                   -> product_library_items.category
-- savedItem.status                     -> product_library_items.status
-- savedItem.sellingPrice               -> product_library_items.current_selling_price
-- savedItem.targetProfitMargin         -> product_library_items.target_profit_margin
-- savedItem.expectedMonthlySales       -> product_library_items.expected_monthly_sales
-- savedItem.costPerProduct/finalCost   -> product_library_items.total_cost_per_unit
-- savedItem.suggestedSellingPrice      -> product_library_items.suggested_selling_price
-- savedItem.grossProfit                -> product_library_items.gross_profit_per_unit
-- savedItem.profitMargin               -> product_library_items.gross_margin_percentage
-- savedItem.markup                     -> product_library_items.markup_percentage
-- savedItem.breakEvenUnits             -> product_library_items.break_even_units
-- savedItem.pricingStatus              -> product_library_items.pricing_health
-- savedItem.redFlags                   -> product_library_items.red_flags
-- savedItem.materials[]                -> product_library_components (material)
-- savedItem.packagingMaterials[]       -> product_library_components (packaging)
