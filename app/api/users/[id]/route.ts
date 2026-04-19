import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/middleware'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [userRes, solvesRes, challengesRes] = await Promise.all([
    supabaseAdmin.from('users')
      .select('id,name,leetcode_username,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at')
      .eq('id', id).single(),
    supabaseAdmin.from('solves')
      .select('problem_title,difficulty,points,solved_at')
      .eq('user_id', id).order('solved_at', { ascending: false }).limit(10),
    supabaseAdmin.from('challenge_participants')
      .select('challenge_id,points_earned,rank_in_challenge,challenges(title)')
      .eq('user_id', id).order('joined_at', { ascending: false }).limit(5),
  ])

  if (!userRes.data) return serverError('User not found')

  const challenge_history = (challengesRes.data ?? []).map((cp: any) => ({
    challenge_id: cp.challenge_id,
    title: cp.challenges?.title ?? 'Unknown',
    points_earned: cp.points_earned,
    rank_in_challenge: cp.rank_in_challenge,
  }))

  return ok({ ...userRes.data, recent_solves: solvesRes.data ?? [], challenge_history })
}
