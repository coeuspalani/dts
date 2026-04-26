import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, badRequest, forbidden, serverError } from '@/lib/middleware'
import { sendChallengeCertificateEmail, isMailConfigured } from '@/lib/email'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabaseAdmin.from('challenges').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  return ok(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()

  const body = await req.json()
  const allowed = ['title', 'start_date', 'end_date', 'status']
  const updates: Record<string, any> = {}
  for (const key of allowed) if (body[key] !== undefined) updates[key] = body[key]

  if (updates.status && !['upcoming','active','paused','completed'].includes(updates.status))
    return badRequest('Invalid status value')
  if (!Object.keys(updates).length) return badRequest('No valid fields to update')

  const preflight = await supabaseAdmin
    .from('challenges')
    .select('status,title,end_date')
    .eq('id', id)
    .single()

  if (preflight.error || !preflight.data) return serverError('Challenge not found')
  const willComplete = updates.status === 'completed' && preflight.data.status !== 'completed'

  const { data, error } = await supabaseAdmin.from('challenges').update(updates)
    .eq('id', id).select('*').single()
  if (error || !data) return serverError('Update failed')

  if (willComplete && isMailConfigured()) {
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('challenge_participants')
      .select('rank_in_challenge,points_earned,solves_in_challenge,users(name,email,leetcode_username)')
      .eq('challenge_id', id)
      .order('rank_in_challenge', { ascending: true })

    if (!participantsError && participants?.length) {
      const results = await Promise.allSettled(participants.map(async (participant: any) => {
        const userInfo = participant.users
        if (!userInfo?.email) throw new Error('Missing participant email')

        return sendChallengeCertificateEmail({
          to: userInfo.email,
          name: userInfo.name || userInfo.leetcode_username || 'Participant',
          challengeTitle: preflight.data.title,
          rank: Number(participant.rank_in_challenge ?? 0),
          points: Number(participant.points_earned ?? 0),
          solves: Number(participant.solves_in_challenge ?? 0),
          challengeDate: preflight.data.end_date ?? new Date().toISOString().split('T')[0],
        })
      }))

      const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
      if (failures.length) {
        console.error(`Certificate email failures for challenge ${id}:`, failures.map(f => f.reason))
      }
    }
  }

  return ok(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser(req)
  if (!user || user.role !== 'admin') return forbidden()
  const { error } = await supabaseAdmin.from('challenges').delete().eq('id', id)
  if (error) return serverError('Delete failed')
  return ok({ message: 'Challenge deleted' })
}
