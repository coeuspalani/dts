import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  // Get last 8 days of snapshots, one row per day (earliest and latest)
  // We get ALL snapshots from last 8 days then aggregate in JS
  const { data, error } = await supabaseAdmin
    .from('solve_history')
    .select('snapshot_date, solve_count, easy_solved, medium_solved, hard_solved, points, snapshot_time')
    .eq('user_id', user.sub)
    .gte('snapshot_date', new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true })
    .order('snapshot_time', { ascending: true })

  if (error) return serverError('Failed to fetch history')

  if (!data || data.length === 0) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    return ok(days.map(day => ({ day, solves: 0, points: 0, easy: 0, medium: 0, hard: 0 })))
  }

  // Group by date — keep first (earliest) and last (latest) snapshot per day
  const byDate: Record<string, { first: any; last: any }> = {}
  for (const row of data) {
    if (!byDate[row.snapshot_date]) byDate[row.snapshot_date] = { first: row, last: row }
    else byDate[row.snapshot_date].last = row
  }

  // Build sorted array of dates
  const dates = Object.keys(byDate).sort()

  // Compute daily gain = last snapshot of day minus first snapshot of PREVIOUS day
  // This shows "how many problems did you solve today"
  const chartData = []
  for (let i = 0; i < dates.length; i++) {
    const curr = byDate[dates[i]]
    const prev = i > 0 ? byDate[dates[i - 1]] : null
    const prevCount  = prev ? prev.last.solve_count   : curr.first.solve_count
    const prevEasy   = prev ? prev.last.easy_solved   : curr.first.easy_solved
    const prevMedium = prev ? prev.last.medium_solved : curr.first.medium_solved
    const prevHard   = prev ? prev.last.hard_solved   : curr.first.hard_solved
    const prevPoints = prev ? prev.last.points        : curr.first.points

    const date = new Date(dates[i] + 'T00:00:00')
    chartData.push({
      day:    date.toLocaleDateString('en-US', { weekday: 'short' }),
      date:   dates[i],
      solves: Math.max(0, curr.last.solve_count   - prevCount),
      easy:   Math.max(0, curr.last.easy_solved   - prevEasy),
      medium: Math.max(0, curr.last.medium_solved - prevMedium),
      hard:   Math.max(0, curr.last.hard_solved   - prevHard),
      points: Math.max(0, curr.last.points        - prevPoints),
    })
  }

  // Keep only last 7 days, pad if needed
  const result = chartData.slice(-7)
  while (result.length < 7) {
    result.unshift({ day: '—', date: '', solves: 0, easy: 0, medium: 0, hard: 0, points: 0 })
  }

  return ok(result)
}
