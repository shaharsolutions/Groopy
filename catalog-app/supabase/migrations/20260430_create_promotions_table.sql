-- Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    message TEXT,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_trigger TEXT DEFAULT 'cart_drawer',
    discount_type TEXT DEFAULT 'none', -- 'none', 'percentage', 'fixed'
    discount_value NUMERIC DEFAULT 0,
    min_order_value NUMERIC DEFAULT 0
);

-- Add RLS policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to promotions" ON public.promotions
    FOR SELECT USING (true);

CREATE POLICY "Allow all access to authenticated users" ON public.promotions
    FOR ALL USING (true);
