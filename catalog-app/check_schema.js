import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read supabaseClient.js to get URL and Key
const clientFile = fs.readFileSync('./src/supabaseClient.js', 'utf8');
const urlMatch = clientFile.match(/const supabaseUrl = ['"](.*?)['"]/);
const keyMatch = clientFile.match(/const supabaseAnonKey = ['"](.*?)['"]/);

if (!urlMatch || !keyMatch) {
  console.error('Could not find Supabase URL or Key');
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseAnonKey = keyMatch[1];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching orders:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in orders table:', Object.keys(data[0]));
  } else {
     // If no data, try to get column names via RPC or a fake update
     console.log('No orders found to check columns. Trying to get schema via RPC or introspection is harder with anon key. Let us try to insert a dummy and see error.');
  }
}

checkSchema();
