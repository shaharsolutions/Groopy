-- Create personalized_links table
CREATE TABLE IF NOT EXISTS personalized_links (
    id VARCHAR(8) PRIMARY KEY,
    agent_id VARCHAR(255),
    categories TEXT[],
    banners UUID[],
    expires_at BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE personalized_links ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read (needed for catalog)
CREATE POLICY "Allow public read of personalized links" 
ON personalized_links FOR SELECT 
TO public 
USING (true);

-- Create policy to allow anyone to insert (simplified for this app's admin context)
CREATE POLICY "Allow public insert of personalized links" 
ON personalized_links FOR INSERT 
TO public 
WITH CHECK (true);
