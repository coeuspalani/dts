import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  // Get ALL snapshots for last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data: recentSnaps, error } = await supabaseAdmin
    .from('solve_history')
    .select('snapshot_date, solve_count, easy_solved, medium_solved, hard_solved, points, snapshot_time')
    .eq('user_id', user.sub)
    .gte('snapshot_date', sevenDaysAgo)
    .order('snapshot_time', { ascending: true })

  if (error) return serverError('Failed to fetch history')

  // Also get the snapshot just BEFORE the 7-day window to use as baseline
  const { data: baselineSnap } = await supabaseAdmin
    .from('solve_history')
    .select('snapshot_date, solve_count, easy_solved, medium_solved, hard_solved, points, snapshot_time')
    .eq('user_id', user.sub)
    .lt('snapshot_date', sevenDaysAgo)
    .order('snapshot_time', { ascending: false })
    .limit(1)

  // Build 7-day array (last 7 days)
  const days: { date: string; day: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    days.push({
      date: d.toISOString().split('T')[0],
      day:  d.toLocaleDateString('en-US', { weekday: 'short' }),
    })
  }

  // Group snapshots by date — keep earliest (start of day) and latest (end of day)
  const byDate: Record<string, { first: any; last: any }> = {}
  for (const snap of recentSnaps ?? []) {
    if (!byDate[snap.snapshot_date]) {
      byDate[snap.snapshot_date] = { first: snap, last: snap }
    } else {
      byDate[snap.snapshot_date].last = snap
    }
  }

  // Baseline = snapshot before window OR first snapshot we have
  const baseline = baselineSnap?.[0] ?? (recentSnaps?.[0] ?? null)

  const chartData = days.map((d, i) => {
    const todaySnaps = byDate[d.date]
    if (!todaySnaps) {
      return { day: d.day, date: d.date, solves: 0, easy: 0, medium: 0, hard: 0, points: 0 }
    }

    // Previous reference: latest snapshot of previous day, or baseline
    let prevRef: any = baseline
    for (let j = i - 1; j >= 0; j--) {
      const prevDate = days[j].date
      if (byDate[prevDate]) { prevRef = byDate[prevDate].last; break }
    }

    // If no previous reference at all, use start-of-day snapshot as ref (diff within day)
    if (!prevRef) prevRef = todaySnaps.first

    const solves = Math.max(0, todaySnaps.last.solve_count   - prevRef.solve_count)
    const easy   = Math.max(0, todaySnaps.last.easy_solved   - prevRef.easy_solved)
    const medium = Math.max(0, todaySnaps.last.medium_solved - prevRef.medium_solved)
    const hard   = Math.max(0, todaySnaps.last.hard_solved   - prevRef.hard_solved)
    const points = Math.max(0, todaySnaps.last.points        - prevRef.points)

    return { day: d.day, date: d.date, solves, easy, medium, hard, points }
  })

  // Edge case: if ALL diffs are 0 but we have multiple snapshots on the same day,
  // show total gained in that day (last - first of day) for today
  const allZero = chartData.every(d => d.solves === 0)
  if (allZero && recentSnaps && recentSnaps.length >= 2) {
    const today = days[days.length - 1].date
    const todaySnaps = byDate[today]
    if (todaySnaps) {
      const allSnapsForUser = recentSnaps.filter(s => s.snapshot_date === today)
      if (allSnapsForUser.length >= 2) {
        const first = allSnapsForUser[0]
        const last  = allSnapsForUser[allSnapsForUser.length - 1]
        chartData[chartData.length - 1] = {
          day:    days[days.length - 1].day,
          date:   today,
          solves: Math.max(0, last.solve_count   - first.solve_count),
          easy:   Math.max(0, last.easy_solved   - first.easy_solved),
          medium: Math.max(0, last.medium_solved - first.medium_solved),
          hard:   Math.max(0, last.hard_solved   - first.hard_solved),
          points: Math.max(0, last.points        - first.points),
        }
      }
    }
  }

  return ok(chartData)
}
