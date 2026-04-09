-- Add order_index column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Initialize order_index based on current name sort
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) - 1 as new_index
  FROM categories
)
UPDATE categories
SET order_index = ranked.new_index
FROM ranked
WHERE categories.id = ranked.id;
