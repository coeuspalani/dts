import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  // 1 SQL function replaces 2 sequential queries
  const { data, error } = await supabaseAdmin
    .rpc('get_weekly_stats', { p_user_id: user.sub })

  if (error) return serverError('Failed to fetch history')

  const rows = data ?? []

  // Build last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    return { date: d.toISOString().split('T')[0], day: d.toLocaleDateString('en-US', { weekday: 'short' }) }
  })

  // Index DB rows by date
  const byDate: Record<string, typeof rows[0]> = {}
  for (const r of rows) byDate[r.snapshot_date] = r

  const chartData = days.map((d, i) => {
    const curr = byDate[d.date]
    if (!curr) return { day: d.day, date: d.date, solves: 0, easy: 0, medium: 0, hard: 0, points: 0 }

    // Find nearest previous day's last snapshot as reference
    let prevLast: typeof rows[0] | null = null
    for (let j = i - 1; j >= 0; j--) {
      const pd = byDate[days[j].date]
      if (pd) { prevLast = pd; break }
    }

    const ref = prevLast ?? curr  // if no prev, diff is first vs last of today
    const prevSolves = prevLast ? ref.last_solve_count  : curr.first_solve_count
    const prevEasy   = prevLast ? ref.last_easy         : curr.first_easy
    const prevMedium = prevLast ? ref.last_medium        : curr.first_medium
    const prevHard   = prevLast ? ref.last_hard          : curr.first_hard
    const prevPoints = prevLast ? ref.last_points        : curr.first_points

    return {
      day:    d.day,
      date:   d.date,
      solves: Math.max(0, curr.last_solve_count  - prevSolves),
      easy:   Math.max(0, curr.last_easy         - prevEasy),
      medium: Math.max(0, curr.last_medium       - prevMedium),
      hard:   Math.max(0, curr.last_hard         - prevHard),
      points: Math.max(0, curr.last_points       - prevPoints),
    }
  })

  return ok(chartData)
}
