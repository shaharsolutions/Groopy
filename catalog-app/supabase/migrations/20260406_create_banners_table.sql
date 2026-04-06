-- Create Banners table
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    image TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    target_type TEXT DEFAULT 'none', -- 'category', 'product', 'badge', 'none'
    target_value TEXT,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.banners
    FOR SELECT USING (true);

-- Allow all access for authenticated users (admin)
CREATE POLICY "Allow all access for authenticated users" ON public.banners
    FOR ALL USING (true) WITH CHECK (true);
