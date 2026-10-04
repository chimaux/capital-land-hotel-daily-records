import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  console.warn(
    'Missing Supabase env vars — copy .env.example to .env.local and fill in your project URL and anon key.'
  )
}

export const supabase = createClient(url, anonKey)
