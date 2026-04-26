import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, forbidden, serverError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const { searchParams } = new URL(req.url)
  const challenge_id = searchParams.get('challenge_id')

  // ── List all completed challenges ─────────────────────────────────────
  if (!challenge_id) {
    const { data: challenges, error } = await supabaseAdmin
      .from('challenges')
      .select('id, title, status, start_date, end_date, duration_days')
      .eq('status', 'completed')
      .order('end_date', { ascending: false })

    if (error) return serverError('Failed to fetch challenges')

    // Get result counts for each
    const ids = (challenges ?? []).map(c => c.id)
    const { data: counts } = await supabaseAdmin
      .from('challenge_results')
      .select('challenge_id')
      .in('challenge_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])

    // Also get participant counts as fallback
    const { data: partCounts } = await supabaseAdmin
      .from('challenge_participants')
      .select('challenge_id')
      .in('challenge_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])

    const resultMap: Record<string, number>  = {}
    const partMap:   Record<string, number>  = {}
    for (const r of counts   ?? []) resultMap[r.challenge_id] = (resultMap[r.challenge_id] ?? 0) + 1
    for (const p of partCounts ?? []) partMap[p.challenge_id]  = (partMap[p.challenge_id]  ?? 0) + 1

    const enriched = (challenges ?? []).map(c => ({
      ...c,
      participant_count: resultMap[c.id] ?? partMap[c.id] ?? 0,
      finalized:         (resultMap[c.id] ?? 0) > 0,
    }))

    return ok(enriched)
  }

  // ── Results for a specific challenge ──────────────────────────────────
  const [challengeRes, resultsRes] = await Promise.all([
    supabaseAdmin.from('challenges')
      .select('id, title, status, start_date, end_date, duration_days')
      .eq('id', challenge_id).single(),
    supabaseAdmin.from('challenge_results')
      .select('*')
      .eq('challenge_id', challenge_id)
      .order('final_rank', { ascending: true }),
  ])

  if (challengeRes.error || !challengeRes.data) {
    return serverError('Challenge not found')
  }

  let results = resultsRes.data ?? []

  // ── Fallback: if challenge_results empty, auto-finalize from participants ──
  if (results.length === 0 && challengeRes.data.status === 'completed') {
    const { data: finalizeCount } = await supabaseAdmin
      .rpc('finalize_challenge', { p_challenge_id: challenge_id })

    if (finalizeCount && finalizeCount > 0) {
      const { data: fresh } = await supabaseAdmin
        .from('challenge_results')
        .select('*')
        .eq('challenge_id', challenge_id)
        .order('final_rank', { ascending: true })
      results = fresh ?? []
    }
  }

  return ok({ challenge: challengeRes.data, results })
}

// POST — resend certificates
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const { challenge_id } = await req.json()
  if (!challenge_id) return serverError('challenge_id required')

  await supabaseAdmin
    .from('challenge_results')
    .update({ certificate_sent: false, certificate_sent_at: null })
    .eq('challenge_id', challenge_id)

  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-certificates`
  try {
    const res  = await fetch(edgeUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ challenge_id }),
    })
    const data = await res.json()
    return ok(data)
  } catch (e: any) {
    return serverError(`Edge function error: ${e.message}`)
  }
}
