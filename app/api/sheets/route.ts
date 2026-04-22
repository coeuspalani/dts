import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/middleware'
import { NextResponse } from 'next/server'

// Cache headers: sheets data is static — cache for 1 hour
const CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }

export async function GET(_req: NextRequest) {
  // Use SQL aggregation — no JS-side counting of all question objects
  const { data, error } = await supabaseAdmin
    .from('question_sheets')
    .select(`
      id, name, slug, description, source_url, total_count,
      question_topics (
        id, name, order_index,
        total:questions(count),
        with_lc:questions(count).eq(has_leetcode,true)
      )
    `)
    .order('created_at', { ascending: true })

  if (error) {
    // Fallback: manual count query if embedded count fails
    const { data: sheets, error: e2 } = await supabaseAdmin
      .from('question_sheets')
      .select('id, name, slug, description, source_url, total_count')
      .order('created_at', { ascending: true })
    if (e2) return serverError('Failed to fetch sheets')

    const { data: topics } = await supabaseAdmin
      .from('question_topics')
      .select('id, sheet_id, name, order_index')
      .order('order_index', { ascending: true })

    const { data: counts } = await supabaseAdmin
      .from('questions')
      .select('topic_id, has_leetcode')

    const countMap: Record<string, { total: number; with_lc: number }> = {}
    for (const q of counts ?? []) {
      if (!countMap[q.topic_id]) countMap[q.topic_id] = { total: 0, with_lc: 0 }
      countMap[q.topic_id].total++
      if (q.has_leetcode) countMap[q.topic_id].with_lc++
    }

    const enriched = (sheets ?? []).map(s => ({
      ...s,
      question_topics: (topics ?? [])
        .filter(t => t.sheet_id === s.id)
        .map(t => ({ ...t, total: countMap[t.id]?.total ?? 0, with_lc: countMap[t.id]?.with_lc ?? 0 })),
    }))

    return NextResponse.json({ success: true, data: enriched }, { headers: CACHE })
  }

  const enriched = (data ?? []).map((sheet: any) => ({
    ...sheet,
    question_topics: (sheet.question_topics ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((t: any) => ({
        id:          t.id,
        name:        t.name,
        order_index: t.order_index,
        total:       Array.isArray(t.total)   ? t.total[0]?.count   ?? 0 : t.total   ?? 0,
        with_lc:     Array.isArray(t.with_lc) ? t.with_lc[0]?.count ?? 0 : t.with_lc ?? 0,
      })),
  }))

  return NextResponse.json({ success: true, data: enriched }, { headers: CACHE })
}
