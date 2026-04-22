import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, forbidden, serverError } from '@/lib/middleware'

// 1 SQL function replaces 3 parallel queries + client-side grouping
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const { data, error } = await supabaseAdmin.rpc('get_admin_stats')
  if (error) return serverError()

  return ok(data)
}
