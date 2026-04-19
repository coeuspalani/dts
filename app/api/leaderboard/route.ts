import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challenge_id = searchParams.get('challenge_id')
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 50), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const view = challenge_id ? 'challenge_leaderboard' : 'leaderboard'
  let query = supabaseAdmin.from(view).select('*', { count: 'exact' }).range(offset, offset + limit - 1)
  if (challenge_id) query = query.eq('challenge_id', challenge_id)

  const { data, error, count } = await query
  if (error) return serverError('Failed to fetch leaderboard')
  return ok({ entries: data, total: count ?? 0 })
}
