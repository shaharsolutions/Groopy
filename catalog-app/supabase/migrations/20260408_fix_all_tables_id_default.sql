-- Ensure extensions schema exists and uuid-ossp is enabled
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Set default value for id column in products table
ALTER TABLE products ALTER COLUMN id SET DEFAULT extensions.uuid_generate_v4();

-- Set default value for id column in categories table (if it exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
        ALTER TABLE categories ALTER COLUMN id SET DEFAULT extensions.uuid_generate_v4();
    END IF;
END $$;

-- Set default value for id column in brands table (if it exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brands') THEN
        ALTER TABLE brands ALTER COLUMN id SET DEFAULT extensions.uuid_generate_v4();
    END IF;
END $$;
