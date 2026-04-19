import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, badRequest, unauthorized, serverError } from '@/lib/middleware'
import { NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  const { data: challenge } = await supabaseAdmin.from('challenges')
    .select('id,status').eq('id', params.id).single()
  if (!challenge) return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 })
  if (challenge.status !== 'active') return badRequest('Can only join active challenges')

  const { data: userData } = await supabaseAdmin.from('users')
    .select('solve_count').eq('id', user.sub).single()
  const baseline = userData?.solve_count ?? 0

  const { data, error } = await supabaseAdmin.from('challenge_participants')
    .upsert({ challenge_id: params.id, user_id: user.sub,
      solve_count_at_start: baseline, solve_count_current: baseline },
      { onConflict: 'challenge_id,user_id', ignoreDuplicates: true })
    .select('*').single()

  if (error) return serverError('Failed to join challenge')
  return ok(data, 201)
}
