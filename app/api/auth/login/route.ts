import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ok, badRequest, serverError } from '@/lib/middleware'
import { NextResponse } from 'next/server'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(':')
    if (!saltHex || !hashHex) return false
    const salt   = Buffer.from(saltHex, 'hex')
    const keyMat = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMat, 256
    )
    return Buffer.from(bits).toString('hex') === hashHex
  } catch {
    return false
  }
}

async function signToken(payload: object, expirySeconds: number): Promise<string> {
  const secret  = new TextEncoder().encode(process.env.JWT_SECRET!)
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + expirySeconds }))
  const data    = `${header}.${body}`
  const key     = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig     = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64  = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
  return `${data}.${sigB64}`
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 })
    }

    const supabase = db()

    // Find user by email
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id,name,email,leetcode_username,role,password_hash,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at,created_at,updated_at,email_verified')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (fetchErr || !user) {
      // Be specific: email not found
      return NextResponse.json({
        success: false,
        error: 'No account found with this email address'
      }, { status: 401 })
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({
        success: false,
        error: 'Incorrect password — please try again'
      }, { status: 401 })
    }

    // Issue tokens
    const accessPayload  = { sub: user.id, email: user.email, role: user.role }
    const access_token   = await signToken(accessPayload, 15 * 60)          // 15 min
    const refresh_token  = await signToken({ sub: user.id }, 30 * 24 * 3600) // 30 days

    // Store refresh token
    await supabase.from('refresh_tokens').insert({
      user_id:    user.id,
      token:      refresh_token,
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    })

    // Return user without password_hash
    const { password_hash, ...safeUser } = user

    return NextResponse.json({
      success: true,
      data: { user: safeUser, access_token, refresh_token }
    })
  } catch (e: any) {
    console.error('[login] error:', e)
    return NextResponse.json({ success: false, error: 'Something went wrong — please try again' }, { status: 500 })
  }
}
