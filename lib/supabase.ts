import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yufhvklzfrbvxmmuejxh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DiOKi1h73L0oJT6bqejIGw_hWpEMcS9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
