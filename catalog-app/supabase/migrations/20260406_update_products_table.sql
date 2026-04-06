-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hot_deal BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_clearing BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_quantity INTEGER DEFAULT 12;

-- Add notes column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
