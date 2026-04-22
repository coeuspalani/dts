import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

// GET /api/dashboard — single endpoint that returns everything the dashboard needs
// Replaces: /api/leaderboard + /api/challenges + N x /api/challenges/[id]/join
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  const [lbResult, challengeResult] = await Promise.all([
    // Top 5 leaderboard
    supabaseAdmin
      .from('leaderboard')
      .select('rank,id,name,leetcode_username,solve_count,easy_solved,medium_solved,hard_solved,points,streak')
      .range(0, 4),

    // All active/upcoming challenges + this user's join status — 1 SQL function
    supabaseAdmin.rpc('get_dashboard_challenges', { p_user_id: user.sub }),
  ])

  if (lbResult.error || challengeResult.error)
    return serverError('Failed to load dashboard')

  return ok({
    leaderboard: lbResult.data ?? [],
    challenges:  challengeResult.data ?? [],
  })
}
