import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, forbidden, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const [usersRes, challengesRes, participantsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
    supabaseAdmin.from('challenges').select('status'),
    supabaseAdmin.from('challenge_participants').select('id', { count: 'exact', head: true }),
  ])

  if (challengesRes.error) return serverError()
  const challenges = challengesRes.data ?? []

  return ok({
    total_users:        usersRes.count ?? 0,
    active_challenges:  challenges.filter(c => c.status === 'active').length,
    total_participants: participantsRes.count ?? 0,
    challenges_by_status: ['upcoming','active','paused','completed'].map(s => ({
      status: s, count: challenges.filter(c => c.status === s).length,
    })),
  })
}
