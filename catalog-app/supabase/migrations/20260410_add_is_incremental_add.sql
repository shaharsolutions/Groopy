-- Add is_incremental_add column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_incremental_add BOOLEAN DEFAULT false;
