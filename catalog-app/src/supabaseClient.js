import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ezelahmdjgvuqewkrdtd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZWxhaG1kamd2dXFld2tyZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDM2ODEsImV4cCI6MjA5MDY3OTY4MX0.U7O0TqA3SWgrppe4HODKJUGoFx4t152zsbkx4ewYPB8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
