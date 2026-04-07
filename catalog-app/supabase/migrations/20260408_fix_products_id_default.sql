-- Set default value for id column in products table to ensure new products are created correctly
-- We use uuid_generate_v4() as it's already used in the banners table

ALTER TABLE products ALTER COLUMN id SET DEFAULT extensions.uuid_generate_v4();
