import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, forbidden, serverError } from '@/lib/middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden('Admin access required')

  const { id } = await params
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id,title,status,start_date,end_date,created_by')
    .eq('id', id)
    .single()

  if (challengeError || !challenge) return serverError('Challenge not found')

  const { data: participants, error: participantsError } = await supabaseAdmin
    .from('challenge_participants')
    .select('user_id,rank_in_challenge,points_earned,solves_in_challenge,joined_at,users(id,name,email,leetcode_username)')
    .eq('challenge_id', id)
    .order('rank_in_challenge', { ascending: true })

  if (participantsError) return serverError('Failed to fetch leaderboard')

  return ok({ challenge, participants: participants ?? [] })
}
