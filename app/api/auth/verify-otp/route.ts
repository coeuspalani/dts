import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// POST /api/auth/verify-otp
// Body: { email, code, purpose }
// Returns: { success, verified }
export async function POST(req: NextRequest) {
  try {
    const { email, code, purpose } = await req.json()

    if (!email || !code || !purpose) {
      return NextResponse.json({ success: false, error: 'email, code and purpose required' }, { status: 400 })
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, error: 'Code must be 6 digits' }, { status: 400 })
    }

    const supabase = db()

    // Find matching valid OTP
    const { data: otp, error } = await supabase
      .from('otp_codes')
      .select('id, code, expires_at, used')
      .eq('email', email)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !otp) {
      return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 400 })
    }

    if (otp.code !== code) {
      return NextResponse.json({ success: false, error: 'Incorrect code — please try again' }, { status: 400 })
    }

    // Mark as used
    await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id)

    // If verifying email, mark user as verified
    if (purpose === 'verify_email') {
      await supabase.from('users').update({ email_verified: true }).eq('email', email)
    }

    return NextResponse.json({ success: true, verified: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
