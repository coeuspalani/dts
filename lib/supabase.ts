import { createClient } from '@supabase/supabase-js'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Module-level singletons — created once per cold start, reused across requests
// This avoids re-establishing connections on every API call
export const supabase      = createClient(url, anonKey, {
  auth: { persistSession: false },
})

export const supabaseAdmin = createClient(url, svcKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
