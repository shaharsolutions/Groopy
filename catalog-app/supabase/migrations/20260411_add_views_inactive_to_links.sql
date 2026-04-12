-- Add views_inactive column to personalized_links table
ALTER TABLE personalized_links ADD COLUMN IF NOT EXISTS views_inactive BIGINT DEFAULT 0;
