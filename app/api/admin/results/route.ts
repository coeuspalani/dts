import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, forbidden, serverError } from '@/lib/middleware'

// GET /api/admin/results?challenge_id=xxx
// Returns full results for a completed challenge — admin only
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const { searchParams } = new URL(req.url)
  const challenge_id = searchParams.get('challenge_id')

  if (!challenge_id) {
    // Return all completed challenges with result counts
    const { data, error } = await supabaseAdmin
      .from('challenges')
      .select(`
        id, title, status, start_date, end_date, duration_days,
        challenge_results(count)
      `)
      .eq('status', 'completed')
      .order('end_date', { ascending: false })

    if (error) return serverError()

    const enriched = (data ?? []).map((c: any) => ({
      ...c,
      participant_count: c.challenge_results?.[0]?.count ?? 0,
      challenge_results: undefined,
    }))
    return ok(enriched)
  }

  // Return full results for a specific challenge
  const [challengeRes, resultsRes] = await Promise.all([
    supabaseAdmin.from('challenges')
      .select('id, title, status, start_date, end_date, duration_days')
      .eq('id', challenge_id).single(),
    supabaseAdmin.from('challenge_results')
      .select('*')
      .eq('challenge_id', challenge_id)
      .order('final_rank', { ascending: true }),
  ])

  if (challengeRes.error || !challengeRes.data) return serverError('Challenge not found')

  return ok({
    challenge: challengeRes.data,
    results:   resultsRes.data ?? [],
  })
}

// POST /api/admin/results/resend — resend certificates for a challenge
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const { challenge_id } = await req.json()
  if (!challenge_id) return serverError('challenge_id required')

  // Reset sent flags so Edge Function resends
  const { error } = await supabaseAdmin
    .from('challenge_results')
    .update({ certificate_sent: false, certificate_sent_at: null })
    .eq('challenge_id', challenge_id)

  if (error) return serverError('Failed to reset certificate flags')

  // Trigger Edge Function
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
