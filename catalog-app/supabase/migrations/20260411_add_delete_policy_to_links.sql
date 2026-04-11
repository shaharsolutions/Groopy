-- Add policy to allow public delete of personalized links
-- This is needed for the Admin panel to permanently remove links
DROP POLICY IF EXISTS "Allow public delete of personalized links" ON personalized_links;
CREATE POLICY "Allow public delete of personalized links" 
ON personalized_links FOR DELETE 
TO public 
USING (true);
