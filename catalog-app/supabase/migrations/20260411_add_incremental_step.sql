-- Add incremental_step column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS incremental_step NUMERIC;

-- Optional: Add a comment to the column for clarity
COMMENT ON COLUMN products.incremental_step IS 'The amount of units to add on each subsequent click after the initial carton addition.';
