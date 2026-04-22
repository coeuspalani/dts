import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken, signAccessToken, signRefreshToken } from '@/lib/auth'
import { ok, unauthorized, badRequest } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  const { refresh_token } = await req.json()
  if (!refresh_token) return badRequest('refresh_token required')

  const payload = await verifyToken(refresh_token)
  if (!payload) return unauthorized('Invalid or expired refresh token')

  const { data: stored } = await supabaseAdmin
    .from('refresh_tokens').select('id,user_id').eq('token', refresh_token)
    .gt('expires_at', new Date().toISOString()).single()

  if (!stored) return unauthorized('Refresh token revoked or expired')

  await supabaseAdmin.from('refresh_tokens').delete().eq('token', refresh_token)

  const { data: user } = await supabaseAdmin.from('users').select('id,email,role').eq('id', stored.user_id).single()
  if (!user) return unauthorized('User not found')

  const access_token  = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
  const refresh_token_new = await signRefreshToken(user.id)
  await supabaseAdmin.from('refresh_tokens').insert({ user_id: user.id, token: refresh_token_new })

  return ok({ access_token, refresh_token: refresh_token_new })
}
