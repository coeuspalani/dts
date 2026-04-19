import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser, ok, badRequest, forbidden, serverError } from '@/lib/middleware'

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

  const { data, error } = await supabaseAdmin.from('challenges').update(updates)
    .eq('id', id).select('*').single()
  if (error || !data) return serverError('Update failed')
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
