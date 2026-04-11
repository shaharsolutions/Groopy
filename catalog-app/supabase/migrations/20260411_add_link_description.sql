-- Add description column to personalized_links table
ALTER TABLE personalized_links ADD COLUMN IF NOT EXISTS description TEXT;
