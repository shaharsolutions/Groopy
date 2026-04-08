-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_name TEXT NOT NULL UNIQUE,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    additional_contacts JSONB DEFAULT '[]'::jsonb,
    notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add UNIQUE constraint to business_name if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_business_name_key') THEN
        ALTER TABLE customers ADD CONSTRAINT customers_business_name_key UNIQUE (business_name);
    END IF;
    
    -- Relax email constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_email_key') THEN
        ALTER TABLE customers DROP CONSTRAINT customers_email_key;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers (business_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Simple policy for admin access (assuming authenticated users are admins for now, 
-- or you can refine this based on your auth logic)
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON customers;
CREATE POLICY "Allow all access to authenticated users" 
ON customers FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow anonymous users (customers in the catalog) to insert/upsert themselves
-- Upsert requires SELECT, INSERT, and UPDATE permissions
DROP POLICY IF EXISTS "Allow anon to insert customers" ON customers;
DROP POLICY IF EXISTS "Allow anon to select customers" ON customers;
DROP POLICY IF EXISTS "Allow anon to upsert customers" ON customers;

CREATE POLICY "Allow anon to upsert customers" 
ON customers FOR ALL
TO anon 
USING (true)
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
