import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, serverError } from '@/lib/middleware'

// Single RPC replaces slug→id lookup + questions query + progress query
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user = await getUser(req)

  const { data, error } = await supabaseAdmin.rpc('get_questions', {
    p_sheet_slug: searchParams.get('sheet') ?? 'striver-a2z',
    p_user_id:    user?.sub ?? null,
    p_topic_id:   searchParams.get('topic')      ?? null,
    p_difficulty: searchParams.get('difficulty') ?? null,
    p_has_lc:     searchParams.get('has_lc') === 'true' ? true : null,
    p_search:     searchParams.get('q')?.trim()  ?? null,
    p_limit:      Math.min(Number(searchParams.get('limit') ?? 200), 500),
    p_offset:     Number(searchParams.get('offset') ?? 0),
  })

  if (error) return serverError('Failed to fetch questions')
  return ok(data)
}
