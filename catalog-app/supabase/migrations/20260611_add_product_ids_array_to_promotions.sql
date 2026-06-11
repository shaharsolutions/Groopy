-- Drop product_id column if exists
ALTER TABLE public.promotions DROP COLUMN IF EXISTS product_id;

-- Add product_ids array column to promotions table
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS product_ids TEXT[] DEFAULT '{}'::TEXT[];
