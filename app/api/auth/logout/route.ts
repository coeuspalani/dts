import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  const { refresh_token } = await req.json().catch(() => ({}))
  if (refresh_token) {
    await supabaseAdmin.from('refresh_tokens').delete().eq('token', refresh_token)
  }
  return ok({ message: 'Logged out' })
}
