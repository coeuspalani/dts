import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

// GET /api/users/me/weekly
// Returns last 7 days of solve snapshots for the chart
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  // Get last 8 days of snapshots (7 diffs need 8 points)
  const { data, error } = await supabaseAdmin
    .from('solve_history')
    .select('snapshot_date, solve_count, easy_solved, medium_solved, hard_solved, points')
    .eq('user_id', user.sub)
    .order('snapshot_date', { ascending: false })
    .limit(8)

  if (error) return serverError('Failed to fetch history')

  if (!data || data.length === 0) {
    // No history yet — return zeros for 7 days
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    return ok(days.map(day => ({ day, solves: 0, points: 0 })))
  }

  // Reverse to get chronological order
  const sorted = [...data].reverse()

  // Compute daily diffs (solves gained each day)
  const chartData = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const date = new Date(curr.snapshot_date)
    chartData.push({
      day:    date.toLocaleDateString('en-US', { weekday: 'short' }),
      date:   curr.snapshot_date,
      solves: Math.max(0, curr.solve_count - prev.solve_count),
      easy:   Math.max(0, curr.easy_solved - prev.easy_solved),
      medium: Math.max(0, curr.medium_solved - prev.medium_solved),
      hard:   Math.max(0, curr.hard_solved - prev.hard_solved),
      points: Math.max(0, curr.points - prev.points),
    })
  }

  // Pad to 7 days if not enough history
  while (chartData.length < 7) {
    chartData.unshift({ day: '—', date: '', solves: 0, easy: 0, medium: 0, hard: 0, points: 0 })
  }

  return ok(chartData.slice(-7))
}
