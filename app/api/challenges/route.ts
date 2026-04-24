import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, badRequest, forbidden, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('challenges')
    .select('*')
    .order('start_date', { ascending: false })

  // If no filter → return active + upcoming
  // If status=all → return everything
  // Otherwise → filter by exact status
  if (!status || status === 'all') {
    if (status !== 'all') {
      query = query.in('status', ['active', 'upcoming'])
    }
    // status=all: no filter, return everything
  } else {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return serverError('Failed to fetch challenges')
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return forbidden('Authentication required')
  if (user.role !== 'admin') return forbidden('Admin access required')

  const { title, start_date, end_date, status = 'upcoming' } = await req.json()
  if (!title || !start_date || !end_date) return badRequest('title, start_date, end_date are required')
  if (new Date(end_date) <= new Date(start_date)) return badRequest('end_date must be after start_date')

  const { data, error } = await supabaseAdmin
    .from('challenges')
    .insert({ title, start_date, end_date, status, created_by: user.sub })
    .select('*').single()

  if (error || !data) return serverError('Failed to create challenge')
  return ok(data, 201)
}
