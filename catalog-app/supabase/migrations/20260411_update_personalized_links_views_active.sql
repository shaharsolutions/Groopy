-- Update personalized_links table with views and is_active columns
ALTER TABLE personalized_links 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add policy to allow public update of views
-- This is needed for the Catalog to increment views
DROP POLICY IF EXISTS "Allow public update of views" ON personalized_links;
CREATE POLICY "Allow public update of views" 
ON personalized_links FOR UPDATE 
TO public 
USING (true) 
WITH CHECK (true);
