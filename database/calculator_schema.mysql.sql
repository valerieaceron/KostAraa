-- Kostaraa Calculator schema
-- Target database: MySQL 8.0+
-- Dependencies:
--   users(id)
--   business_profiles(id)
--   inventory_items(id)
--   product_library_items(id)


-- One row represents a user's editable calculator workspace/draft.
CREATE TABLE calculator_drafts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    business_profile_id BIGINT UNSIGNED NULL,
    product_library_item_id BIGINT UNSIGNED NULL,

    -- Draft identity
    draft_name VARCHAR(180) NOT NULL DEFAULT 'Untitled calculation',
    item_type ENUM('product', 'service') NOT NULL DEFAULT 'product',
    category VARCHAR(100) NOT NULL DEFAULT 'Other',
    status ENUM('draft', 'calculated', 'saved_to_library', 'archived')
        NOT NULL DEFAULT 'draft',
    currency_code CHAR(3) NOT NULL DEFAULT 'PHP',

    -- Sales and pricing inputs
    current_selling_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    expected_monthly_sales DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    target_profit_margin DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    marketing_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    markup_topup_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,
    tax_mode ENUM('vat', 'percentage', 'exempt', 'income8', 'custom')
        NOT NULL DEFAULT 'exempt',
    tax_percentage DECIMAL(7, 4) UNSIGNED NOT NULL DEFAULT 0,

    -- Other user-entered per-item costs
    packaging_addon_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    platform_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    marketing_addon_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    other_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,

    -- Business Profile values copied at calculation time
    monthly_sales_target DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    total_labor_cost_monthly DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    total_overhead_cost_monthly DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,

    -- Optional product-specific operation-cost override
    use_operation_cost_override BOOLEAN NOT NULL DEFAULT FALSE,
    labor_cost_override_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    overhead_cost_override_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,

    -- Latest calculated result
    material_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    packaging_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    labor_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    operation_cost_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    total_cost_of_goods DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    marketing_amount_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    tax_amount_per_unit DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    suggested_selling_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    break_even_selling_price DECIMAL(14, 2) UNSIGNED NOT NULL DEFAULT 0,
    profit_per_unit DECIMAL(14, 4) NOT NULL DEFAULT 0,
    gross_margin_percentage DECIMAL(7, 4) NOT NULL DEFAULT 0,
    markup_percentage DECIMAL(7, 4) NOT NULL DEFAULT 0,
    break_even_units DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    pricing_health ENUM('healthy', 'warning', 'risky', 'needs_review', 'not_checked')
        NOT NULL DEFAULT 'not_checked',
    red_flags JSON NULL,

    calculation_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    last_calculated_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    KEY idx_calculator_user_status (user_id, status, deleted_at),
    KEY idx_calculator_business (business_profile_id),
    KEY idx_calculator_library_item (product_library_item_id),
    KEY idx_calculator_updated (user_id, updated_at),

    CONSTRAINT chk_calculator_draft_name
        CHECK (CHAR_LENGTH(TRIM(draft_name)) > 0),
    CONSTRAINT chk_calculator_target_margin
        CHECK (target_profit_margin BETWEEN 0 AND 100),
    CONSTRAINT chk_calculator_marketing_percentage
        CHECK (marketing_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_calculator_tax_percentage
        CHECK (tax_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_calculator_markup_topup
        CHECK (markup_topup_percentage >= 0),

    CONSTRAINT fk_calculator_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_calculator_business_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_calculator_library_item
        FOREIGN KEY (product_library_item_id) REFERENCES product_library_items(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Raw Material and Packaging rows shown in Calculator sections 1 and 2.
CREATE TABLE calculator_components (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    calculator_draft_id BIGINT UNSIGNED NOT NULL,
    inventory_item_id BIGINT UNSIGNED NULL,
    component_type ENUM('material', 'packaging') NOT NULL,
    component_name VARCHAR(180) NOT NULL,
    used_quantity DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 1,
    used_unit ENUM('ml', 'g', 'pcs') NOT NULL DEFAULT 'pcs',
    inventory_unit_cost_snapshot DECIMAL(18, 6) UNSIGNED NOT NULL DEFAULT 0,
    computed_cost_per_product DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_calculator_component_draft (calculator_draft_id, component_type, sort_order),
    KEY idx_calculator_component_inventory (inventory_item_id),

    CONSTRAINT chk_calculator_component_name
        CHECK (CHAR_LENGTH(TRIM(component_name)) > 0),
    CONSTRAINT chk_calculator_component_quantity
        CHECK (used_quantity > 0),
    CONSTRAINT fk_calculator_component_draft
        FOREIGN KEY (calculator_draft_id) REFERENCES calculator_drafts(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_calculator_component_inventory
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Immutable result history for recalculation, comparison, and audit purposes.
CREATE TABLE calculator_runs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    calculator_draft_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    business_profile_snapshot JSON NOT NULL,
    calculator_input_snapshot JSON NOT NULL,
    calculator_result_snapshot JSON NOT NULL,
    calculation_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_calculator_run_draft (calculator_draft_id, calculated_at),
    KEY idx_calculator_run_user (user_id, calculated_at),

    CONSTRAINT fk_calculator_run_draft
        FOREIGN KEY (calculator_draft_id) REFERENCES calculator_drafts(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_calculator_run_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Current React-to-database mapping:
-- product.productName                         -> calculator_drafts.draft_name
-- product.productCategory                     -> calculator_drafts.category
-- product.sellingPrice                        -> calculator_drafts.current_selling_price
-- product.targetMargin                        -> calculator_drafts.target_profit_margin
-- product.expectedSales                       -> calculator_drafts.expected_monthly_sales
-- product.ingredients[]                       -> calculator_components (material)
-- product.packaging[]                         -> calculator_components (packaging)
-- product.otherCosts.packaging                -> calculator_drafts.packaging_addon_per_unit
-- product.otherCosts.platform                 -> calculator_drafts.platform_cost_per_unit
-- product.otherCosts.marketing                -> calculator_drafts.marketing_addon_per_unit
-- product.otherCosts.other                    -> calculator_drafts.other_cost_per_unit
-- product.operationalOverride.enabled         -> calculator_drafts.use_operation_cost_override
-- product.operationalOverride.laborCostPerUnit
--     -> calculator_drafts.labor_cost_override_per_unit
-- product.operationalOverride.overheadCostPerUnit
--     -> calculator_drafts.overhead_cost_override_per_unit
-- Business Profile monthlySalesUnits          -> calculator_drafts.monthly_sales_target
-- Business Profile total labor                -> calculator_drafts.total_labor_cost_monthly
-- Business Profile monthlyOverheadPool        -> calculator_drafts.total_overhead_cost_monthly
-- results.materialCost                        -> calculator_drafts.material_cost_per_unit
-- results.packagingCost                       -> calculator_drafts.packaging_cost_per_unit
-- results.costBreakdown.Labor                 -> calculator_drafts.labor_cost_per_unit
-- results.overheadCost                        -> calculator_drafts.operation_cost_per_unit
-- results.totalVariableCost                   -> calculator_drafts.total_cost_of_goods
