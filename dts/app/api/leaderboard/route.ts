import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challenge_id = searchParams.get('challenge_id')
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 50), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  // Global leaderboard: cache 30s (updates every sync cycle)
  // Challenge leaderboard: cache 30s
  const headers = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }

  if (challenge_id) {
    const { data, error, count } = await supabaseAdmin
      .from('challenge_leaderboard')
      .select('rank,challenge_id,user_id,name,leetcode_username,solves_in_challenge,points_earned,rank_change',
        { count: 'exact' })
      .eq('challenge_id', challenge_id)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
    return NextResponse.json({ success: true, data: { entries: data, total: count ?? 0 } }, { headers })
  }

  const { data, error, count } = await supabaseAdmin
    .from('leaderboard')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  return NextResponse.json({ success: true, data: { entries: data, total: count ?? 0 } }, { headers })
}
