import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, forbidden, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(Number(searchParams.get('limit') ?? 100), 200)
  const offset = Number(searchParams.get('offset') ?? 0)
  const role   = searchParams.get('role')

  let query = supabaseAdmin
    .from('users')
    .select(
      'id,name,email,leetcode_username,role,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at,created_at,updated_at',
      { count: 'exact' }
    )
    .order('current_rank', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (role) query = query.eq('role', role)

  const { data, error, count } = await query
  if (error) return serverError()
  return ok({ users: data, total: count ?? 0 })
}
