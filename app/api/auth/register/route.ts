import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth'
import { fetchLeetCodeStats } from '@/lib/leetcode'
import { ok, badRequest, serverError } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  const { name, email, password, leetcode_username } = await req.json()

  if (!name || !email || !password || !leetcode_username)
    return badRequest('All fields are required')
  if (password.length < 6)
    return badRequest('Password must be at least 6 characters')

  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', email).single()
  if (existing) return badRequest('Email already registered')

  let lcStats
  try { lcStats = await fetchLeetCodeStats(leetcode_username) }
  catch (e: any) { return badRequest(e.message) }

  const passwordHash = await hashPassword(password)
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ name, email, leetcode_username, password_hash: passwordHash, role: 'member',
      solve_count: lcStats.totalSolved, easy_solved: lcStats.easySolved,
      medium_solved: lcStats.mediumSolved, hard_solved: lcStats.hardSolved,
      points: lcStats.points, last_synced_at: new Date().toISOString() })
    .select('id,name,email,leetcode_username,role,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at,created_at,updated_at')
    .single()

  if (error || !user) return serverError('Failed to create user')

  const access_token  = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
  const refresh_token = await signRefreshToken(user.id)
  await supabaseAdmin.from('refresh_tokens').insert({ user_id: user.id, token: refresh_token })

  return ok({ user, access_token, refresh_token }, 201)
}
