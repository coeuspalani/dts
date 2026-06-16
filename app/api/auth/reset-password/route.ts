import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function hashPassword(password: string): Promise<string> {
  const salt   = crypto.getRandomValues(new Uint8Array(16))
  const keyMat = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMat, 256
  )
  return `${Buffer.from(salt).toString('hex')}:${Buffer.from(bits).toString('hex')}`
}

// POST /api/auth/reset-password
// Body: { email, code, new_password }
// Verifies OTP one more time then resets password
export async function POST(req: NextRequest) {
  try {
    const { email, code, new_password } = await req.json()

    if (!email || !code || !new_password) {
      return NextResponse.json({
        success: false, error: 'email, code and new_password required'
      }, { status: 400 })
    }

    if (new_password.length < 6) {
      return NextResponse.json({
        success: false, error: 'Password must be at least 6 characters'
      }, { status: 400 })
    }

    const supabase = db()

    // Re-verify OTP (must be unused + valid for reset_password)
    const { data: otp, error: otpError } = await supabase
      .from('otp_codes')
      .select('id, code, expires_at, used')
      .eq('email', email)
      .eq('purpose', 'reset_password')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otp) {
      console.error('[reset-password] OTP lookup error:', otpError)
      return NextResponse.json({
        success: false, error: 'Invalid or expired code — please request a new one'
      }, { status: 400 })
    }

    if (otp.code !== code) {
      return NextResponse.json({
        success: false, error: 'Incorrect code'
      }, { status: 400 })
    }

    // Verify user exists before attempting update
    const { data: userCheck, error: userCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userCheckError || !userCheck) {
      console.error('[reset-password] User lookup error:', userCheckError)
      return NextResponse.json({
        success: false, error: 'User account not found'
      }, { status: 404 })
    }

    // Hash new password
    const passwordHash = await hashPassword(new_password)

    // Update user password
    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', userCheck.id)

    if (updateErr) {
      console.error('[reset-password] Password update error:', updateErr)
      return NextResponse.json({ 
        success: false, error: 'Failed to update password' 
      }, { status: 500 })
    }

    // Invalidate the OTP
    await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id)

    // Revoke all existing refresh tokens (force re-login everywhere)
    await supabase.from('refresh_tokens').delete().eq('user_id', userCheck.id)

    return NextResponse.json({ success: true, message: 'Password updated — please log in' })
  } catch (e: any) {
    console.error('[reset-password] Unexpected error:', e)
    return NextResponse.json({ 
      success: false, error: 'Server error: ' + (e.message ?? 'unknown') 
    }, { status: 500 })
  }
}
