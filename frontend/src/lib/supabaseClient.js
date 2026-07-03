/**
 * supabaseClient.js
 * -----------------
 * Initializes and exports the single Supabase client instance.
 *
 * Requires in frontend/.env:
 *   VITE_SUPABASE_URL      = https://jwyywicdrhcrhbglhohg.supabase.co
 *   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * Get your anon key from:
 *   Supabase Dashboard → Settings (⚙️) → API → "anon public" key
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Guard: catch missing or placeholder values before they cause cryptic errors
if (!supabaseUrl || supabaseUrl.includes('YOUR_') || supabaseUrl.includes('PASTE_')) {
  throw new Error(
    '❌ VITE_SUPABASE_URL is not set.\n' +
    'Open frontend/.env and set it to your Supabase project URL.'
  )
}

if (
  !supabaseAnonKey ||
  supabaseAnonKey.includes('YOUR_') ||
  supabaseAnonKey.includes('PASTE_') ||
  !supabaseAnonKey.startsWith('eyJ')   // all valid Supabase JWTs start with eyJ
) {
  throw new Error(
    '❌ VITE_SUPABASE_ANON_KEY is missing or invalid.\n\n' +
    'How to fix:\n' +
    '  1. Go to https://supabase.com/dashboard/project/jwyywicdrhcrhbglhohg\n' +
    '  2. Click Settings (⚙️) → API\n' +
    '  3. Copy the "anon  public" key (starts with eyJ...)\n' +
    '  4. Open frontend/.env\n' +
    '  5. Set: VITE_SUPABASE_ANON_KEY=eyJ... (paste the full key)\n' +
    '  6. Save the file and restart the dev server (Ctrl+C then npm run dev)'
  )
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export default supabase
