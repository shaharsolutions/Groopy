-- Drop existing table
DROP TABLE IF EXISTS personalized_links;

-- Recreate table with SERIAL ID (starts from 1)
CREATE TABLE personalized_links (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255),
    categories TEXT[],
    banners UUID[],
    expires_at BIGINT,
    description TEXT,
    views INTEGER DEFAULT 0,
    views_inactive INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE personalized_links ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read (needed for catalog)
CREATE POLICY "Allow public read of personalized links" 
ON personalized_links FOR SELECT 
TO public 
USING (true);

-- Create policy to allow anyone to insert
CREATE POLICY "Allow public insert of personalized links" 
ON personalized_links FOR INSERT 
TO public 
WITH CHECK (true);

-- Create policy to allow anyone to update (needed for view counts)
CREATE POLICY "Allow public update of personalized links" 
ON personalized_links FOR UPDATE
TO public 
USING (true)
WITH CHECK (true);

-- Create policy to allow anyone to delete
CREATE POLICY "Allow public delete of personalized links" 
ON personalized_links FOR DELETE
TO public 
USING (true);
