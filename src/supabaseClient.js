import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('=== Supabase URL:', supabaseUrl ? supabaseUrl.slice(0, 30) : 'MISSING')
console.log('=== Supabase Key:', supabaseKey ? supabaseKey.slice(0, 10) : 'MISSING')

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})
