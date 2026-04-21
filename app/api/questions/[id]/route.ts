import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, unauthorized, serverError } from '@/lib/middleware'

// PATCH /api/questions/[id] — update user progress (solved / bookmarked / revisit)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return unauthorized()

  const { status, notes } = await req.json()
  const validStatuses = ['unsolved', 'solved', 'bookmarked', 'revisit']
  if (!validStatuses.includes(status)) {
    return serverError('Invalid status')
  }

  const { data, error } = await supabaseAdmin
    .from('user_question_progress')
    .upsert({
      user_id:     user.sub,
      question_id: id,
      status,
      notes:       notes ?? null,
      solved_at:   status === 'solved' ? new Date().toISOString() : null,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id,question_id' })
    .select('*')
    .single()

  if (error) return serverError('Failed to update progress')
  return ok(data)
}
