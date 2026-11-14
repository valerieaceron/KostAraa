-- Durable private payment proofs. Receipt bytes are never served by static hosting.
CREATE TABLE IF NOT EXISTS sales_channel_payment_proof_files (
  proof_id BIGINT UNSIGNED NOT NULL,
  business_profile_id INT UNSIGNED NOT NULL,
  content LONGBLOB NOT NULL,
  sha256 CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (proof_id),
  KEY idx_sc_proof_file_business (business_profile_id),
  CONSTRAINT fk_sc_proof_file_proof FOREIGN KEY (proof_id)
    REFERENCES sales_channel_payment_proofs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sc_proof_file_business FOREIGN KEY (business_profile_id)
    REFERENCES business_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
