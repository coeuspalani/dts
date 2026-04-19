import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchLeetCodeStats } from '@/lib/leetcode'
import { getUser, ok, unauthorized, forbidden, serverError } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  const isCron = req.headers.get('x-sync-secret') === process.env.SYNC_SECRET
  const user   = isCron ? null : await getUser(req)
  if (!isCron && !user) return unauthorized()

  const body = await req.json().catch(() => ({}))
  const { leetcode_username } = body

  let usersToSync: { id: string; leetcode_username: string }[] = []

  if (leetcode_username) {
    const { data, error } = await supabaseAdmin.from('users')
      .select('id,leetcode_username').eq('leetcode_username', leetcode_username).single()
    if (error || !data) return serverError(`User "${leetcode_username}" not found`)
    if (!isCron && user?.role !== 'admin' && data.id !== user?.sub)
      return forbidden('You can only sync your own account')
    usersToSync = [data]
  } else {
    if (!isCron && user?.role !== 'admin') return forbidden('Admin or cron required')
    const { data } = await supabaseAdmin.from('users')
      .select('id,leetcode_username').eq('role', 'member')
    usersToSync = data ?? []
  }

  const results: any[] = []
  const errors:  any[] = []
  const today = new Date().toISOString().split('T')[0]

  for (const u of usersToSync) {
    try {
      const s = await fetchLeetCodeStats(u.leetcode_username)

      // 1. Update users table
      const { error: userErr } = await supabaseAdmin.from('users').update({
        solve_count:    s.totalSolved,
        easy_solved:    s.easySolved,
        medium_solved:  s.mediumSolved,
        hard_solved:    s.hardSolved,
        points:         s.points,
        last_synced_at: new Date().toISOString(),
      }).eq('id', u.id)
      if (userErr) throw userErr

      // 2. Upsert daily snapshot for weekly chart
      await supabaseAdmin.from('solve_history').upsert({
        user_id:       u.id,
        snapshot_date: today,
        solve_count:   s.totalSolved,
        easy_solved:   s.easySolved,
        medium_solved: s.mediumSolved,
        hard_solved:   s.hardSolved,
        points:        s.points,
      }, { onConflict: 'user_id,snapshot_date' })

      // 3. Update active challenge participations for this user
      const { data: participations } = await supabaseAdmin
        .from('challenge_participants')
        .select('id, solve_count_at_start, points_at_start, challenges!inner(status)')
        .eq('user_id', u.id)
        .eq('challenges.status', 'active')

      for (const p of participations ?? []) {
        const solvesDiff = Math.max(0, s.totalSolved - p.solve_count_at_start)
        // Points earned = difference in points since joining
        const pointsDiff = Math.max(0, s.points - p.points_at_start)

        await supabaseAdmin.from('challenge_participants').update({
          solve_count_current: s.totalSolved,
          points_earned:       pointsDiff,
          updated_at:          new Date().toISOString(),
        }).eq('id', p.id)
      }

      results.push({ leetcode_username: u.leetcode_username, ...s })
    } catch (e: any) {
      errors.push({ leetcode_username: u.leetcode_username, error: e.message })
    }
  }

  // 4. Re-rank all members globally
  const { data: ranked } = await supabaseAdmin.from('users')
    .select('id').eq('role', 'member').order('points', { ascending: false })
  if (ranked) {
    for (let i = 0; i < ranked.length; i++) {
      await supabaseAdmin.from('users')
        .update({ current_rank: i + 1 }).eq('id', ranked[i].id)
    }
  }

  // 5. Re-rank participants within each active challenge by points_earned
  const { data: activeChallenges } = await supabaseAdmin
    .from('challenges').select('id').eq('status', 'active')

  for (const challenge of activeChallenges ?? []) {
    const { data: pts } = await supabaseAdmin
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challenge.id)
      .order('points_earned', { ascending: false })

    for (let i = 0; i < (pts ?? []).length; i++) {
      await supabaseAdmin.from('challenge_participants')
        .update({ rank_in_challenge: i + 1 })
        .eq('id', pts![i].id)
    }
  }

  return ok({
    synced:       results.length,
    ranked_count: ranked?.length ?? 0,
    synced_at:    new Date().toISOString(),
    results,
    errors,
  })
}

export async function GET(req: NextRequest) {
  if (req.headers.get('x-sync-secret') !== process.env.SYNC_SECRET)
    return unauthorized('Invalid sync secret')
  return POST(new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({}),
  }) as NextRequest)
}
