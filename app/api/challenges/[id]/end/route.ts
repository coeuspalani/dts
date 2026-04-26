import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, forbidden, serverError } from '@/lib/middleware'

// POST /api/challenges/[id]/end
// 1. Snapshots final results via finalize_challenge()
// 2. Calls send-certificates Edge Function
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user   = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  // Step 1: Finalize — snapshot results + mark completed
  const { data: count, error: finalizeErr } = await supabaseAdmin
    .rpc('finalize_challenge', { p_challenge_id: id })

  if (finalizeErr) {
    return serverError(`Failed to finalize: ${finalizeErr.message}`)
  }

  // Step 2: Trigger certificate emails via Edge Function (fire-and-forget style)
  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-certificates`
  let emailResult: any = { sent: 0, failed: 0 }

  try {
    const res = await fetch(edgeUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ challenge_id: id }),
    })
    emailResult = await res.json()
  } catch (e: any) {
    // Don't fail the whole request if email fails
    emailResult = { sent: 0, failed: count ?? 0, error: e.message }
  }

  return ok({
    participants_finalized: count ?? 0,
    certificates_sent:      emailResult.sent ?? 0,
    certificates_failed:    emailResult.failed ?? 0,
    message: `Challenge ended. ${emailResult.sent ?? 0} certificates sent.`,
  })
}
