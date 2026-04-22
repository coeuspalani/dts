import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, signAccessToken, signRefreshToken } from '@/lib/auth'
import { ok, badRequest, unauthorized, serverError } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return badRequest('Email and password required')

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id,name,email,leetcode_username,role,password_hash,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at,created_at,updated_at')
    .eq('email', email).single()

  if (!user) return unauthorized('Invalid email or password')

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return unauthorized('Invalid email or password')

  const access_token  = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
  const refresh_token = await signRefreshToken(user.id)
  await supabaseAdmin.from('refresh_tokens').insert({ user_id: user.id, token: refresh_token })

  const { password_hash, ...safeUser } = user
  return ok({ user: safeUser, access_token, refresh_token })
}
