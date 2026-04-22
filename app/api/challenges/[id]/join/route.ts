import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

// POST — join challenge via SQL function (3 queries → 1)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return unauthorized()

  const { data, error } = await supabaseAdmin.rpc('join_challenge', {
    p_user_id:     user.sub,
    p_challenge_id: id,
  })

  if (error) return serverError('Failed to join challenge')
  if (data?.code === 404) return NextResponse.json({ success: false, error: data.error }, { status: 404 })
  if (data?.code === 400) return NextResponse.json({ success: false, error: data.error }, { status: 400 })

  return ok(data)
}

// GET — check join status: select only 2 fields instead of *
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return unauthorized()

  const { data } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, points_earned')
    .eq('challenge_id', id)
    .eq('user_id', user.sub)
    .maybeSingle()

  return ok({ joined: !!data, participant: data ?? null })
}
