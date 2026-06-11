import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

const FIELDS = 'id,name,email,leetcode_username,role,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at,created_at,updated_at'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  const db = getAdmin()
  const { data, error } = await db
    .from('users')
    .select(FIELDS)
    .eq('id', user.sub)
    .single()

  if (error || !data) return serverError('User not found')
  return ok(data)
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return unauthorized()

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ success: false, error: 'name required' }, { status: 400 })
  }

  const db = getAdmin()
  const { data, error } = await db
    .from('users')
    .update({ name: name.trim() })
    .eq('id', user.sub)
    .select(FIELDS)
    .single()

  if (error || !data) return serverError('Update failed')
  return ok(data)
}

// Need NextResponse for the PATCH error case
import { NextResponse } from 'next/server'
