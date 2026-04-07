-- Add style columns to banners table
ALTER TABLE public.banners 
ADD COLUMN IF NOT EXISTS pos_x INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS pos_y INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS zoom FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS object_fit TEXT DEFAULT 'cover';

-- Comment on columns
COMMENT ON COLUMN public.banners.pos_x IS 'Horizontal position of the image in percentage (0-100)';
COMMENT ON COLUMN public.banners.pos_y IS 'Vertical position of the image in percentage (0-100)';
COMMENT ON COLUMN public.banners.zoom IS 'Zoom level of the image (1.0 = normal)';
COMMENT ON COLUMN public.banners.object_fit IS 'CSS object-fit property value (cover, contain, fill)';
