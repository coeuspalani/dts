import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challenge_id = searchParams.get('challenge_id')
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 50), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  if (challenge_id) {
    // Per-challenge leaderboard — uses the fixed view
    const { data, error, count } = await supabaseAdmin
      .from('challenge_leaderboard')
      .select('rank, challenge_id, user_id, name, leetcode_username, solves_in_challenge, points_earned, rank_change', { count: 'exact' })
      .eq('challenge_id', challenge_id)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return serverError('Failed to fetch challenge leaderboard')
    return ok({ entries: data, total: count ?? 0 })
  }

  // Global leaderboard
  const { data, error, count } = await supabaseAdmin
    .from('leaderboard')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)

  if (error) return serverError('Failed to fetch leaderboard')
  return ok({ entries: data, total: count ?? 0 })
}
