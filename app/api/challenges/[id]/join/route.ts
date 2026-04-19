import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, badRequest, unauthorized, serverError } from '@/lib/middleware'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return unauthorized()

  const { data: challenge } = await supabaseAdmin
    .from('challenges').select('id,status').eq('id', id).single()
  if (!challenge)
    return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 })
  if (challenge.status !== 'active')
    return badRequest('Can only join active challenges')

  // Already joined? Return existing row gracefully
  const { data: existing } = await supabaseAdmin
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', id)
    .eq('user_id', user.sub)
    .single()

  if (existing) return ok({ ...existing, already_joined: true })

  // Snapshot current solve count + points as baseline
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('solve_count, points')
    .eq('id', user.sub)
    .single()

  const baseline       = userData?.solve_count ?? 0
  const pointsBaseline = userData?.points      ?? 0

  const { data, error } = await supabaseAdmin
    .from('challenge_participants')
    .insert({
      challenge_id:         id,
      user_id:              user.sub,
      solve_count_at_start: baseline,
      solve_count_current:  baseline,
      points_at_start:      pointsBaseline,
      points_earned:        0,
      rank_in_challenge:    null,
    })
    .select('*')
    .single()

  if (error || !data) return serverError('Failed to join challenge')
  return ok({ ...data, already_joined: false }, 201)
}

// GET — check if current user has joined this challenge
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return unauthorized()

  const { data } = await supabaseAdmin
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', id)
    .eq('user_id', user.sub)
    .single()

  return ok({ joined: !!data, participant: data ?? null })
}
