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
    const { data, error } = await supabaseAdmin
      .from('users').select('id,leetcode_username')
      .eq('leetcode_username', leetcode_username).single()
    if (error || !data) return serverError(`User "${leetcode_username}" not found`)
    if (!isCron && user?.role !== 'admin' && data.id !== user?.sub)
      return forbidden('You can only sync your own account')
    usersToSync = [data]
  } else {
    if (!isCron && user?.role !== 'admin') return forbidden('Admin or cron required')
    const { data } = await supabaseAdmin
      .from('users').select('id,leetcode_username').eq('role', 'member')
    usersToSync = data ?? []
  }

  const results: any[] = []
  const errors:  any[] = []
  const now    = new Date()
  const today  = now.toISOString().split('T')[0]
  const nowISO = now.toISOString()

  // Fetch all LeetCode stats in parallel
  const fetched = await Promise.allSettled(
    usersToSync.map(u =>
      fetchLeetCodeStats(u.leetcode_username).then(s => ({ u, s }))
    )
  )

  const successful: { u: typeof usersToSync[0]; s: Awaited<ReturnType<typeof fetchLeetCodeStats>> }[] = []
  for (const r of fetched) {
    if (r.status === 'fulfilled') successful.push(r.value)
    else errors.push({ error: String((r as any).reason) })
  }

  if (successful.length > 0) {
    // ── Update each user individually (UPDATE not upsert — rows always exist) ──
    const updateResults = await Promise.all(
      successful.map(({ u, s }) =>
        supabaseAdmin.from('users').update({
          solve_count:    s.totalSolved,
          easy_solved:    s.easySolved,
          medium_solved:  s.mediumSolved,
          hard_solved:    s.hardSolved,
          points:         s.points,
          last_synced_at: nowISO,
        }).eq('id', u.id)
      )
    )

    // Check for update errors
    for (const result of updateResults) {
      if (result.error) {
        console.error('[Sync] User update error:', result.error)
        errors.push({ error: `Failed to update user: ${result.error.message}` })
      }
    }

    // ── Batch insert all snapshots ─────────────────────────────────────
    const { error: snapshotError } = await supabaseAdmin.from('solve_history').insert(
      successful.map(({ u, s }) => ({
        user_id:       u.id,
        snapshot_date: today,
        solve_count:   s.totalSolved,
        easy_solved:   s.easySolved,
        medium_solved: s.mediumSolved,
        hard_solved:   s.hardSolved,
        points:        s.points,
        snapshot_time: nowISO,
      }))
    )
    if (snapshotError) {
      console.error('[Sync] Snapshot insert error:', snapshotError)
      errors.push({ error: `Failed to save snapshot: ${snapshotError.message}` })
    }

    // ── Update active challenge participants per user ──────────────────
    const challengeResults = await Promise.all(
      successful.map(({ u, s }) =>
        supabaseAdmin.rpc('sync_challenge_participants', {
          p_user_id:     u.id,
          p_solve_count: s.totalSolved,
          p_points:      s.points,
          p_now:         nowISO,
        })
      )
    )
    
    // Check for RPC errors
    for (const result of challengeResults) {
      if (result.error) {
        console.error('[Sync] Challenge sync RPC error:', result.error)
        errors.push({ error: `Failed to sync challenge: ${result.error.message}` })
      }
    }

    for (const { u, s } of successful) {
      results.push({ leetcode_username: u.leetcode_username, ...s })
    }
  }

  // ── All post-sync rankings in parallel ────────────────────────────────
  const rankResults = await Promise.all([
    supabaseAdmin.rpc('rerank_users'),
    supabaseAdmin.rpc('rerank_challenge_participants'),
    supabaseAdmin.rpc('update_all_streaks'),
  ])

  // Check for ranking errors
  for (const result of rankResults) {
    if (result.error) {
      console.error('[Sync] Ranking RPC error:', result.error)
      errors.push({ error: `Failed to update rankings: ${result.error.message}` })
    }
  }

  return ok({
    synced:    results.length,
    synced_at: nowISO,
    results,
    errors,
  })
}

export async function GET(req: NextRequest) {
  if (req.headers.get('x-sync-secret') !== process.env.SYNC_SECRET)
    return unauthorized('Invalid sync secret')
  return POST(new Request(req.url, {
    method: 'POST', headers: req.headers, body: JSON.stringify({}),
  }) as NextRequest)
}