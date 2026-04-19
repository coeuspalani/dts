import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, badRequest, serverError } from '@/lib/middleware'

const FIELDS = 'id,name,email,leetcode_username,role,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at,created_at,updated_at'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()
  const { data, error } = await supabaseAdmin.from('users').select(FIELDS).eq('id', user.sub).single()
  if (error || !data) return serverError('User not found')
  return ok(data)
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()
  const { name } = await req.json()
  if (!name?.trim()) return badRequest('name is required')
  const { data, error } = await supabaseAdmin.from('users').update({ name: name.trim() })
    .eq('id', user.sub).select(FIELDS).single()
  if (error || !data) return serverError('Update failed')
  return ok(data)
}
