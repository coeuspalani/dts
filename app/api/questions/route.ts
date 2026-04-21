import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sheet_slug  = searchParams.get('sheet') ?? 'striver-a2z'
  const topic_id    = searchParams.get('topic')
  const difficulty  = searchParams.get('difficulty')
  const has_lc      = searchParams.get('has_lc')
  const search      = searchParams.get('q')
  const limit       = Math.min(Number(searchParams.get('limit') ?? 200), 500)
  const offset      = Number(searchParams.get('offset') ?? 0)

  const user = await getUser(req)

  // Resolve sheet id from slug
  const { data: sheet } = await supabaseAdmin
    .from('question_sheets')
    .select('id')
    .eq('slug', sheet_slug)
    .single()

  if (!sheet) return serverError('Sheet not found')

  let query = supabaseAdmin
    .from('questions')
    .select(`
      id, title, difficulty, leetcode_url, leetcode_id, tuf_url,
      order_index, has_leetcode,
      question_topics ( id, name, order_index )
    `, { count: 'exact' })
    .eq('sheet_id', sheet.id)

  if (topic_id)                query = query.eq('topic_id', topic_id)
  if (difficulty)              query = query.eq('difficulty', difficulty)
  if (has_lc === 'true')       query = query.eq('has_leetcode', true)
  if (search?.trim())          query = query.ilike('title', `%${search.trim()}%`)

  query = query
    .order('question_topics(order_index)', { ascending: true })
    .order('order_index', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data: questions, error, count } = await query
  if (error) return serverError('Failed to fetch questions')

  // If user is logged in, fetch their progress for these questions
  let progressMap: Record<string, string> = {}
  if (user) {
    const ids = (questions ?? []).map((q: any) => q.id)
    if (ids.length > 0) {
      const { data: progress } = await supabaseAdmin
        .from('user_question_progress')
        .select('question_id, status')
        .eq('user_id', user.sub)
        .in('question_id', ids)
      for (const p of progress ?? []) progressMap[p.question_id] = p.status
    }
  }

  const enriched = (questions ?? []).map((q: any) => ({
    ...q,
    topic_name:  q.question_topics?.name ?? '',
    topic_order: q.question_topics?.order_index ?? 0,
    status:      progressMap[q.id] ?? 'unsolved',
  }))

  return ok({ questions: enriched, total: count ?? 0 })
}
