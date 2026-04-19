import { createClient } from '@supabase/supabase-js'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser/SSR safe client — respects RLS
export const supabase = createClient(url, anonKey)

// Server-only admin client — bypasses RLS (never expose to client)
export const supabaseAdmin = createClient(url, svcKey)
