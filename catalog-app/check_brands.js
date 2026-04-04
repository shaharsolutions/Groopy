import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrands() {
  const { count, error } = await supabase
    .from('brands')
    .select('*', { count: 'exact', head: true });
  console.log('Brands count:', count);
}

checkBrands();
