-- Migration to remove the 'location' (warehouse location) column from the products table
ALTER TABLE products DROP COLUMN IF EXISTS location;
