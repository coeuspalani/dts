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
    // Non-admin can only sync themselves
    if (!isCron && user?.role !== 'admin' && data.id !== user?.sub)
      return forbidden('You can only sync your own account')
    usersToSync = [data]
  } else {
    if (!isCron && user?.role !== 'admin') return forbidden('Admin or cron required to sync all')
    const { data } = await supabaseAdmin.from('users').select('id,leetcode_username').eq('role', 'member')
    usersToSync = data ?? []
  }

  const results: any[] = []
  const errors:  any[] = []

  for (const u of usersToSync) {
    try {
      const s = await fetchLeetCodeStats(u.leetcode_username)
      const { error } = await supabaseAdmin.from('users').update({
        solve_count: s.totalSolved, easy_solved: s.easySolved,
        medium_solved: s.mediumSolved, hard_solved: s.hardSolved,
        points: s.points, last_synced_at: new Date().toISOString(),
      }).eq('id', u.id)
      if (error) throw error
      results.push({ leetcode_username: u.leetcode_username, ...s })
    } catch (e: any) {
      errors.push({ leetcode_username: u.leetcode_username, error: e.message })
    }
  }

  // Re-rank all members
  const { data: ranked } = await supabaseAdmin.from('users')
    .select('id').eq('role', 'member').order('points', { ascending: false })
  if (ranked) {
    for (let i = 0; i < ranked.length; i++) {
      await supabaseAdmin.from('users').update({ current_rank: i + 1 }).eq('id', ranked[i].id)
    }
  }

  return ok({ synced: results.length, ranked_count: ranked?.length ?? 0,
    synced_at: new Date().toISOString(), results, errors })
}

// Vercel cron hits GET /api/sync
export async function GET(req: NextRequest) {
  if (req.headers.get('x-sync-secret') !== process.env.SYNC_SECRET)
    return unauthorized('Invalid sync secret')
  return POST(new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({}),
  }) as NextRequest)
}
