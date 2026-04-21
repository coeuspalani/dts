import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, serverError } from '@/lib/middleware'

export async function GET(_req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('question_sheets')
    .select(`
      id, name, slug, description, source_url, total_count,
      question_topics (
        id, name, order_index,
        questions ( id, has_leetcode )
      )
    `)
    .order('created_at', { ascending: true })

  if (error) return serverError('Failed to fetch sheets')

  // Enrich with real question counts per topic
  const enriched = (data ?? []).map((sheet: any) => ({
    ...sheet,
    question_topics: (sheet.question_topics ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((t: any) => ({
        id:          t.id,
        name:        t.name,
        order_index: t.order_index,
        total:       t.questions?.length ?? 0,
        with_lc:     t.questions?.filter((q: any) => q.has_leetcode).length ?? 0,
      })),
  }))

  return ok(enriched)
}
