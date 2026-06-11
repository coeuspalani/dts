import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchLeetCodeStats } from '@/lib/leetcode'

// Use service role — bypasses RLS, can write to users table
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// POST /api/sync
// Body: { leetcode_username: string }  → sync one user
// Body: {}                             → sync all (admin/cron only)
export async function POST(req: NextRequest) {
  const isCron = req.headers.get('x-sync-secret') === process.env.SYNC_SECRET

  // Auth check
  let callerId: string | null = null
  let callerRole: string | null = null

  if (!isCron) {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = auth.slice(7)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      callerId   = payload.sub
      callerRole = payload.role
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const { leetcode_username } = body

  const db = getAdmin()

  // ── Determine which users to sync ─────────────────────────────────────
  let usersToSync: { id: string; leetcode_username: string; name: string }[] = []

  if (leetcode_username) {
    // Sync specific user
    const { data, error } = await db
      .from('users')
      .select('id, leetcode_username, name')
      .eq('leetcode_username', leetcode_username)
      .single()

    if (error || !data) {
      return NextResponse.json({
        success: false,
        error: `User "${leetcode_username}" not found in DB. Make sure they registered first.`,
      }, { status: 404 })
    }

    // Non-admin can only sync themselves
    if (!isCron && callerRole !== 'admin' && data.id !== callerId) {
      return NextResponse.json({ success: false, error: 'Can only sync your own account' }, { status: 403 })
    }

    usersToSync = [data]
  } else {
    // Sync all — admin or cron only
    if (!isCron && callerRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin required to sync all' }, { status: 403 })
    }

    const { data, error } = await db
      .from('users')
      .select('id, leetcode_username, name')
      .eq('role', 'member')

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch users: ' + error.message }, { status: 500 })
    }
    usersToSync = data ?? []
  }

  if (usersToSync.length === 0) {
    return NextResponse.json({ success: false, error: 'No users to sync' }, { status: 400 })
  }

  const now    = new Date()
  const nowISO = now.toISOString()
  const today  = nowISO.split('T')[0]

  const results: any[] = []
  const errors:  any[] = []

  // ── Fetch + update each user ───────────────────────────────────────────
  // Run in parallel for speed
  await Promise.all(
    usersToSync.map(async (u) => {
      try {
        // 1. Fetch from LeetCode
        const stats = await fetchLeetCodeStats(u.leetcode_username)

        // 2. UPDATE users table — explicit field-by-field, no upsert
        const { error: updateErr, data: updatedUser } = await db
          .from('users')
          .update({
            solve_count:    stats.totalSolved,
            easy_solved:    stats.easySolved,
            medium_solved:  stats.mediumSolved,
            hard_solved:    stats.hardSolved,
            points:         stats.points,
            last_synced_at: nowISO,
            updated_at:     nowISO,
          })
          .eq('id', u.id)
          .select('id, solve_count, points, easy_solved, medium_solved, hard_solved')
          .single()

        if (updateErr) {
          throw new Error(`DB update failed: ${updateErr.message}`)
        }

        // 3. Insert daily snapshot for weekly chart
        await db.from('solve_history').insert({
          user_id:       u.id,
          snapshot_date: today,
          snapshot_time: nowISO,
          solve_count:   stats.totalSolved,
          easy_solved:   stats.easySolved,
          medium_solved: stats.mediumSolved,
          hard_solved:   stats.hardSolved,
          points:        stats.points,
        })
        // ignore snapshot insert errors (duplicate keys etc.)

        // 4. Update active challenge participants
        const { data: participations } = await db
          .from('challenge_participants')
          .select('id, points_at_start, solve_count_at_start, challenges!inner(status)')
          .eq('user_id', u.id)
          .eq('challenges.status', 'active')

        if (participations && participations.length > 0) {
          await Promise.all(
            participations.map((p: any) =>
              db.from('challenge_participants').update({
                solve_count_current: stats.totalSolved,
                points_earned:       Math.max(0, stats.points - (p.points_at_start ?? 0)),
                updated_at:          nowISO,
              }).eq('id', p.id)
            )
          )
        }

        results.push({
          username:    u.leetcode_username,
          name:        u.name,
          totalSolved: stats.totalSolved,
          easySolved:  stats.easySolved,
          medSolved:   stats.mediumSolved,
          hardSolved:  stats.hardSolved,
          points:      stats.points,
          db_updated:  updatedUser?.solve_count === stats.totalSolved,
        })
      } catch (e: any) {
        errors.push({ username: u.leetcode_username, error: e.message })
      }
    })
  )

  // ── Re-rank all users by points ───────────────────────────────────────
  // Single SQL call — no N UPDATE statements
  if (results.length > 0) {
    await db.rpc('rerank_users').single()
    await db.rpc('rerank_challenge_participants').single()
    await db.rpc('update_all_streaks').single()
  }

  const success = results.length > 0

  return NextResponse.json({
    success,
    synced:    results.length,
    failed:    errors.length,
    synced_at: nowISO,
    results,
    errors,
  }, { status: success ? 200 : 500 })
}

// GET — Vercel cron hits this
export async function GET(req: NextRequest) {
  if (req.headers.get('x-sync-secret') !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return POST(
    new NextRequest(req.url, {
      method:  'POST',
      headers: req.headers,
      body:    JSON.stringify({}),
    })
  )
}
