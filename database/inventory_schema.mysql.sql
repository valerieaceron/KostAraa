-- Kostaraa Inventory schema
-- Target database: MySQL 8.0+
-- Assumption: `users.id` and `business_profiles.id` are BIGINT UNSIGNED.
-- Rename the referenced tables below if your authentication/profile tables use
-- different names.

CREATE TABLE `inventory_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `business_profile_id` int(10) unsigned DEFAULT NULL,
  `material_name` varchar(150) NOT NULL,
  `item_type` enum('ingredient','packaging','supply','other') NOT NULL DEFAULT 'ingredient',
  `category` varchar(100) DEFAULT NULL,
  `sku` varchar(80) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `purchase_cost` decimal(14,2) unsigned NOT NULL,
  `purchase_quantity` decimal(14,4) unsigned NOT NULL,
  `base_unit` enum('mg','g','kg','oz','lb','ml','l','tsp','tbsp','cup','fl oz','mm','cm','m','inch','ft','yard','pcs','dozen','pack','box') NOT NULL,
  `grams_per_cup` decimal(14,4) unsigned DEFAULT NULL,
  `pieces_per_unit` decimal(14,4) unsigned DEFAULT NULL,
  `unit_cost` decimal(18,6) GENERATED ALWAYS AS (`purchase_cost` / nullif(`purchase_quantity` * case `base_unit` when 'mg' then 0.001 when 'kg' then 1000 when 'oz' then 28.349523 when 'lb' then 453.59237 when 'l' then 1000 when 'tsp' then 5 when 'tbsp' then 15 when 'cup' then 240 when 'fl oz' then 29.57353 when 'cm' then 10 when 'm' then 1000 when 'inch' then 25.4 when 'ft' then 304.8 when 'yard' then 914.4 when 'dozen' then 12 when 'pack' then coalesce(`pieces_per_unit`,1) when 'box' then coalesce(`pieces_per_unit`,1) else 1 end,0)) STORED,
  `currency_code` char(3) NOT NULL DEFAULT 'PHP',
  `quantity_on_hand` decimal(14,4) unsigned NOT NULL DEFAULT 0.0000,
  `reorder_level` decimal(14,4) unsigned DEFAULT NULL,
  `supplier_name` varchar(150) DEFAULT NULL,
  `lot_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_user_sku` (`user_id`,`sku`),
  KEY `idx_inventory_user_active` (`user_id`,`is_active`,`deleted_at`),
  KEY `idx_inventory_business` (`business_profile_id`),
  KEY `idx_inventory_material` (`user_id`,`material_name`),
  KEY `idx_inventory_expiry` (`user_id`,`expiry_date`),
  CONSTRAINT `fk_inventory_business_profile` FOREIGN KEY (`business_profile_id`) REFERENCES `business_profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_inventory_material_name` CHECK (char_length(trim(`material_name`)) > 0),
  CONSTRAINT `chk_inventory_purchase_cost` CHECK (`purchase_cost` > 0),
  CONSTRAINT `chk_inventory_purchase_quantity` CHECK (`purchase_quantity` > 0),
  CONSTRAINT `chk_inventory_quantity_on_hand` CHECK (`quantity_on_hand` >= 0),
  CONSTRAINT `chk_inventory_reorder_level` CHECK (`reorder_level` is null or `reorder_level` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


-- Optional stock movement ledger.
-- Keep this table if you want accurate stock history instead of directly
-- replacing quantity_on_hand whenever stock is purchased or consumed.
CREATE TABLE `inventory_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inventory_item_id` bigint(20) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `transaction_type` enum('opening_stock','purchase','product_usage','adjustment_in','adjustment_out','waste','return') NOT NULL,
  `quantity` decimal(14,4) unsigned NOT NULL,
  `unit_cost` decimal(18,6) unsigned DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_inventory_transaction_item_date` (`inventory_item_id`,`occurred_at`),
  KEY `idx_inventory_transaction_user_date` (`user_id`,`occurred_at`),
  KEY `idx_inventory_transaction_type` (`transaction_type`),
  KEY `idx_inventory_transaction_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_inventory_transaction_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_inventory_transaction_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


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
