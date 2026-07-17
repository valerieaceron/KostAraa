-- Kostaraa Inventory schema
-- Target database: MySQL 8.0+
-- Assumption: `users.id` and `business_profiles.id` are BIGINT UNSIGNED.
-- Rename the referenced tables below if your authentication/profile tables use
-- different names.

CREATE TABLE inventory_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    business_profile_id BIGINT UNSIGNED NULL,

    -- Item identity
    material_name VARCHAR(150) NOT NULL,
    item_type ENUM('ingredient', 'packaging', 'supply', 'other')
        NOT NULL DEFAULT 'ingredient',
    category VARCHAR(100) NULL,
    sku VARCHAR(80) NULL,
    description TEXT NULL,

    -- Purchase and costing information
    purchase_cost DECIMAL(14, 2) UNSIGNED NOT NULL,
    purchase_quantity DECIMAL(14, 4) UNSIGNED NOT NULL,
    base_unit ENUM(
        'mg', 'g', 'kg', 'oz', 'lb',
        'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz',
        'mm', 'cm', 'm', 'inch', 'ft', 'yard',
        'pcs', 'dozen', 'pack', 'box'
    ) NOT NULL,
    -- Optional conversion values for cross-family or packaged materials.
    -- Example: flour purchased in kg but used in cups needs grams_per_cup.
    grams_per_cup DECIMAL(14, 4) UNSIGNED NULL,
    pieces_per_unit DECIMAL(14, 4) UNSIGNED NULL,
    unit_cost DECIMAL(18, 6)
        GENERATED ALWAYS AS (
            purchase_cost / NULLIF(
                purchase_quantity * CASE base_unit
                    WHEN 'mg' THEN 0.001 WHEN 'kg' THEN 1000
                    WHEN 'oz' THEN 28.349523 WHEN 'lb' THEN 453.59237
                    WHEN 'l' THEN 1000 WHEN 'tsp' THEN 5 WHEN 'tbsp' THEN 15
                    WHEN 'cup' THEN 240 WHEN 'fl oz' THEN 29.57353
                    WHEN 'cm' THEN 10 WHEN 'm' THEN 1000 WHEN 'inch' THEN 25.4
                    WHEN 'ft' THEN 304.8 WHEN 'yard' THEN 914.4
                    WHEN 'dozen' THEN 12
                    WHEN 'pack' THEN COALESCE(pieces_per_unit, 1)
                    WHEN 'box' THEN COALESCE(pieces_per_unit, 1)
                    ELSE 1
                END,
                0
            )
        ) STORED,
    currency_code CHAR(3) NOT NULL DEFAULT 'PHP',

    -- Stock tracking
    quantity_on_hand DECIMAL(14, 4) UNSIGNED NOT NULL DEFAULT 0,
    reorder_level DECIMAL(14, 4) UNSIGNED NULL,
    supplier_name VARCHAR(150) NULL,
    lot_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    notes TEXT NULL,

    -- Record status and audit fields
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),

    -- A SKU only needs to be unique inside one user's account.
    UNIQUE KEY uq_inventory_user_sku (user_id, sku),
    KEY idx_inventory_user_active (user_id, is_active, deleted_at),
    KEY idx_inventory_business (business_profile_id),
    KEY idx_inventory_material (user_id, material_name),
    KEY idx_inventory_expiry (user_id, expiry_date),

    CONSTRAINT chk_inventory_material_name
        CHECK (CHAR_LENGTH(TRIM(material_name)) > 0),
    CONSTRAINT chk_inventory_purchase_cost
        CHECK (purchase_cost > 0),
    CONSTRAINT chk_inventory_purchase_quantity
        CHECK (purchase_quantity > 0),
    CONSTRAINT chk_inventory_quantity_on_hand
        CHECK (quantity_on_hand >= 0),
    CONSTRAINT chk_inventory_reorder_level
        CHECK (reorder_level IS NULL OR reorder_level >= 0),

    CONSTRAINT fk_inventory_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_inventory_business_profile
        FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Optional stock movement ledger.
-- Keep this table if you want accurate stock history instead of directly
-- replacing quantity_on_hand whenever stock is purchased or consumed.
CREATE TABLE inventory_transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    inventory_item_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    transaction_type ENUM(
        'opening_stock',
        'purchase',
        'product_usage',
        'adjustment_in',
        'adjustment_out',
        'waste',
        'return'
    ) NOT NULL,
    quantity DECIMAL(14, 4) UNSIGNED NOT NULL,
    unit_cost DECIMAL(18, 6) UNSIGNED NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,
    notes VARCHAR(500) NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_inventory_transaction_item_date (inventory_item_id, occurred_at),
    KEY idx_inventory_transaction_user_date (user_id, occurred_at),

    CONSTRAINT chk_inventory_transaction_quantity
        CHECK (quantity > 0),
    CONSTRAINT fk_inventory_transaction_item
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_inventory_transaction_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


-- Mapping from the current React inventory object:
-- id        -> inventory_items.id
-- material  -> inventory_items.material_name
-- itemCost  -> inventory_items.purchase_cost
-- qty       -> inventory_items.purchase_quantity
-- baseUnit  -> inventory_items.base_unit
-- gramsPerCup -> inventory_items.grams_per_cup
-- piecesPerUnit -> inventory_items.pieces_per_unit
--
-- For the first migration, quantity_on_hand may use the same value as
-- purchase_quantity until a separate physical-stock count is available.

-- Example insert matching the current UI:
-- INSERT INTO inventory_items (
--     user_id,
--     business_profile_id,
--     material_name,
--     item_type,
--     purchase_cost,
--     purchase_quantity,
--     base_unit,
--     quantity_on_hand
-- ) VALUES (1, 1, 'Jersey Milk', 'ingredient', 95.00, 1000, 'ml', 1000);
