-- Add is_default_carton column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_default_carton BOOLEAN DEFAULT false;
