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
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMat, 256
  )
  return `${Buffer.from(salt).toString('hex')}:${Buffer.from(bits).toString('hex')}`
}

async function fetchLeetCodeStats(username: string) {
  const res = await fetch('https://leetcode.com/graphql', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer':      'https://leetcode.com',
      'Origin':       'https://leetcode.com',
      'User-Agent':   'Mozilla/5.0',
    },
    body: JSON.stringify({
      query: `query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          submitStatsGlobal { acSubmissionNum { difficulty count } }
        }
      }`,
      variables: { username },
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`)
  const json = await res.json()
  const user = json?.data?.matchedUser
  if (!user) throw new Error(`LeetCode username "${username}" not found — double-check your username`)
  const rows         = user.submitStatsGlobal?.acSubmissionNum ?? []
  const easySolved   = rows.find((r: any) => r.difficulty === 'Easy')?.count   ?? 0
  const mediumSolved = rows.find((r: any) => r.difficulty === 'Medium')?.count ?? 0
  const hardSolved   = rows.find((r: any) => r.difficulty === 'Hard')?.count   ?? 0
  const totalSolved  = rows.find((r: any) => r.difficulty === 'All')?.count    ?? (easySolved + mediumSolved + hardSolved)
  return { totalSolved, easySolved, mediumSolved, hardSolved, points: easySolved + mediumSolved * 2 + hardSolved * 3 }
}

async function signToken(payload: object, expirySeconds: number): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + expirySeconds }))
  const data   = `${header}.${body}`
  const key    = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig    = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
  return `${data}.${sigB64}`
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, leetcode_username, otp_verified } = await req.json()

    // Validate required fields with clear messages
    if (!name?.trim())             return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 })
    if (!email?.trim())            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    if (!password)                 return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 })
    if (password.length < 6)       return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    if (!leetcode_username?.trim())return NextResponse.json({ success: false, error: 'LeetCode username is required' }, { status: 400 })
    if (!otp_verified)             return NextResponse.json({ success: false, error: 'Email verification required' }, { status: 400 })

    const supabase = db()
    const emailLC  = email.trim().toLowerCase()

    // Check email already exists
    const { data: existing } = await supabase.from('users').select('id').eq('email', emailLC).single()
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 })
    }

    // Check LeetCode username already taken
    const { data: lcExists } = await supabase.from('users').select('id').eq('leetcode_username', leetcode_username.trim()).single()
    if (lcExists) {
      return NextResponse.json({ success: false, error: 'This LeetCode username is already registered' }, { status: 409 })
    }

    // Validate LeetCode username and get initial stats
    let lcStats
    try {
      lcStats = await fetchLeetCodeStats(leetcode_username.trim())
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    // Create user
    const { data: user, error: createErr } = await supabase
      .from('users')
      .insert({
        name:              name.trim(),
        email:             emailLC,
        leetcode_username: leetcode_username.trim(),
        password_hash:     passwordHash,
        role:              'member',
        email_verified:    true,
        solve_count:       lcStats.totalSolved,
        easy_solved:       lcStats.easySolved,
        medium_solved:     lcStats.mediumSolved,
        hard_solved:       lcStats.hardSolved,
        points:            lcStats.points,
        last_synced_at:    new Date().toISOString(),
      })
      .select('id,name,email,leetcode_username,role,solve_count,easy_solved,medium_solved,hard_solved,points,current_rank,streak,last_synced_at,created_at,updated_at,email_verified')
      .single()

    if (createErr || !user) {
      console.error('[register] create error:', createErr)
      return NextResponse.json({ success: false, error: 'Failed to create account — please try again' }, { status: 500 })
    }

    // Issue tokens
    const access_token  = await signToken({ sub: user.id, email: user.email, role: user.role }, 15 * 60)
    const refresh_token = await signToken({ sub: user.id }, 30 * 24 * 3600)

    await supabase.from('refresh_tokens').insert({
      user_id:    user.id,
      token:      refresh_token,
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    })

    return NextResponse.json({ success: true, data: { user, access_token, refresh_token } }, { status: 201 })
  } catch (e: any) {
    console.error('[register] error:', e)
    return NextResponse.json({ success: false, error: 'Something went wrong — please try again' }, { status: 500 })
  }
}
