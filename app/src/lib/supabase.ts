import { createClient } from '@supabase/supabase-js';

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://vagczftkcjoaikuvirco.supabase.co';

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  'sb_publishable_tujq9AUsM-Q92D3uytGyuQ_39AJglkb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
