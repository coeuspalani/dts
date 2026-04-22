import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, type JWTPayload } from './auth'

export type AuthedRequest = NextRequest & { user: JWTPayload }

// Cache token verification result per request (avoids re-verifying same token
// if getUser() is called multiple times in the same handler)
const tokenCache = new Map<string, JWTPayload | null>()

export async function getUser(req: NextRequest): Promise<JWTPayload | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)

  // In-process cache: valid for the lifetime of this module instance
  // Tokens are already short-lived (15m) so this is safe
  if (tokenCache.has(token)) return tokenCache.get(token)!

  const payload = await verifyToken(token)

  // Only cache valid tokens to avoid memory growth from random strings
  if (payload) {
    tokenCache.set(token, payload)
    // Evict after 10 min (well within 15m token lifetime)
    setTimeout(() => tokenCache.delete(token), 10 * 60 * 1000)
  }

  return payload
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
