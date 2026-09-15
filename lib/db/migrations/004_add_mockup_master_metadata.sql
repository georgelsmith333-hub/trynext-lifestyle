-- Add auditable editable-master and runtime-binding metadata to mockups.
-- Idempotent for existing Neon/Render environments.

ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_url text;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_name text;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_mime text;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_size integer;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS master_file_sha256 text;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS source_kit_key text;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS face text;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS manifest_json jsonb;
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS ingestion_status text NOT NULL DEFAULT 'preview-only';
ALTER TABLE mockups ADD COLUMN IF NOT EXISTS ingestion_error text;

CREATE INDEX IF NOT EXISTS mockups_source_kit_key_idx ON mockups(source_kit_key);
CREATE INDEX IF NOT EXISTS mockups_ingestion_status_idx ON mockups(ingestion_status);
