import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, type JWTPayload } from './auth'

export type AuthedRequest = NextRequest & { user: JWTPayload }

export async function getUser(req: NextRequest): Promise<JWTPayload | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}

export function unauthorized(msg = 'Unauthorized') {
  return NextResponse.json({ success: false, error: msg }, { status: 401 })
}

export function forbidden(msg = 'Forbidden') {
  return NextResponse.json({ success: false, error: msg }, { status: 403 })
}

export function badRequest(msg: string) {
  return NextResponse.json({ success: false, error: msg }, { status: 400 })
}

export function serverError(msg = 'Internal server error') {
  return NextResponse.json({ success: false, error: msg }, { status: 500 })
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
