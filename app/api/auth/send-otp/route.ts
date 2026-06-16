import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function generateOTP(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 900000 + 100000)
}

function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function sendOTPEmail(to: string, code: string, purpose: string, name?: string) {
  const isReset  = purpose === 'reset_password'
  const subject  = isReset ? 'Reset your DTS password' : 'Verify your DTS email'
  const headline = isReset ? 'Password Reset' : 'Verify Your Email'
  const bodyText = isReset
    ? 'You requested to reset your DTS password. Use the code below.'
    : `Welcome to DTS${name ? `, ${name}` : ''}! Use this code to verify your email.`

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#06060e;font-family:Inter,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%">
  <tr><td align="center" style="padding-bottom:24px">
    <div style="font-family:Georgia,serif;font-size:13px;font-weight:700;letter-spacing:5px;color:#818cf8;text-transform:uppercase">DTS</div>
    <div style="font-size:9px;letter-spacing:4px;color:rgba(255,255,255,.3);text-transform:uppercase">DARE TO SOLVE</div>
  </td></tr>
  <tr><td style="background:linear-gradient(160deg,#0e0e1c,#111128);border:1px solid rgba(129,140,248,.2);border-radius:16px;padding:40px 32px">
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#fff;margin:0 0 8px;text-align:center">${headline}</h1>
    <p style="font-size:13px;color:rgba(255,255,255,.4);line-height:1.7;text-align:center;margin:0 0 28px">${bodyText}</p>
    <div style="background:rgba(129,140,248,.08);border:1px solid rgba(129,140,248,.25);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
      <div style="font-size:10px;letter-spacing:4px;color:rgba(255,255,255,.3);text-transform:uppercase;margin-bottom:12px">Your verification code</div>
      <div style="font-family:'Courier New',monospace;font-size:44px;font-weight:700;color:#818cf8;letter-spacing:14px;line-height:1">${code}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.22);margin-top:12px">Expires in <strong style="color:rgba(255,255,255,.4)">10 minutes</strong> &bull; One-time use only</div>
    </div>
    <p style="font-size:11px;color:rgba(255,255,255,.18);text-align:center;margin:0">If you didn't request this, ignore this email.</p>
  </td></tr>
  <tr><td align="center" style="padding-top:20px">
    <p style="font-size:10px;color:rgba(255,255,255,.12);margin:0">&copy; ${new Date().getFullYear()} DTS — Dare to Solve</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  const MAIL_USER = process.env.MAIL_USERNAME!
  const MAIL_PASS = process.env.MAIL_PASSWORD!
  const MAIL_HOST = process.env.MAIL_SERVER ?? 'smtp.gmail.com'
  const MAIL_PORT = parseInt(process.env.MAIL_PORT ?? '587')

  const enc = new TextEncoder()
  const dec = new TextDecoder()

  const conn = await (globalThis as any).Deno?.connect({ hostname: MAIL_HOST, port: MAIL_PORT })

  // If not Deno (Next.js edge/node), use nodemailer-style raw TCP via net
  // For Vercel serverless, we call the Supabase Edge Function
  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-otp-email`
  const res = await fetch(edgeUrl, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ to, subject, html }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`Email failed: ${text}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, purpose, name } = await req.json()

    if (!email || !purpose) {
      return NextResponse.json({ success: false, error: 'email and purpose required' }, { status: 400 })
    }

    const supabase = db()

    // For reset: don't reveal if email exists
    if (purpose === 'reset_password') {
      const { data: user } = await supabase.from('users').select('id').eq('email', email).single()
      if (!user) {
        return NextResponse.json({ success: true, message: 'If that email exists, a code was sent' })
      }
    }

    // Invalidate existing unused codes
    await supabase.from('otp_codes')
      .update({ used: true })
      .eq('email', email)
      .eq('purpose', purpose)
      .eq('used', false)

    const code = generateOTP()
    const { error } = await supabase.from('otp_codes').insert({
      email,
      code,
      purpose,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to generate code' }, { status: 500 })
    }

    try {
  await sendOTPEmail(email, code, purpose, name)
} catch (e: any) {
  console.error('[send-otp] email error:', e)

  return NextResponse.json(
    {
      success: false,
      error: `Email delivery failed: ${e.message}`
    },
    { status: 500 }
  )
}

return NextResponse.json({
  success: true,
  message: 'Code sent to your email'
})
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
