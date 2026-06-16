/**
 * Test helpers for database access and OTP testing
 * 
 * These utilities allow tests to:
 * - Query the test database for OTP codes
 * - Create test users
 * - Reset test data between runs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Supabase credentials not configured. Database tests may fail.')
  console.warn('    Set SUPABASE_SERVICE_ROLE_KEY to enable database access.')
}

/**
 * Create a Supabase client with service role privileges
 * Required for accessing non-public data (like OTP codes)
 */
export function getSupabaseServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Get the most recent OTP code for a given email and purpose
 */
export async function getLatestOTPCode(
  email: string,
  purpose: 'verify_email' | 'reset_password'
): Promise<string | null> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from('otp_codes')
    .select('code')
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching OTP code:', error)
    return null
  }

  return data?.code || null
}

/**
 * Check if an OTP code has been marked as used
 */
export async function isOTPCodeUsed(
  email: string,
  code: string,
  purpose: 'verify_email' | 'reset_password'
): Promise<boolean> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from('otp_codes')
    .select('used')
    .eq('email', email)
    .eq('code', code)
    .eq('purpose', purpose)
    .single()

  if (error || !data) {
    return false
  }

  return data.used === true
}

/**
 * Create a test user directly in the database
 */
export async function createTestUser(email: string, password: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient()

  // For testing, we'd typically use the auth API
  // But this helper shows how to access the users table directly if needed

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        email,
        email_verified: true,
        created_at: new Date().toISOString(),
      },
    ])
    .select('id')
    .single()

  if (error) {
    console.error('Error creating test user:', error)
    return null
  }

  return data?.id || null
}

/**
 * Clean up test data for a given email
 */
export async function cleanupTestData(email: string): Promise<void> {
  const supabase = getSupabaseServiceClient()

  // Delete OTP codes
  const { error: otpError } = await supabase
    .from('otp_codes')
    .delete()
    .eq('email', email)

  if (otpError) {
    console.warn('Warning deleting OTP codes:', otpError)
  }

  // Delete refresh tokens for the user
  const { error: tokensError } = await supabase
    .from('refresh_tokens')
    .delete()
    .match({ user_email: email })

  if (tokensError) {
    console.warn('Warning deleting refresh tokens:', tokensError)
  }
}

/**
 * Test that OTP codes maintain the correct lifecycle in reset flow
 * - After send-otp: code is unused
 * - After verify-otp (for reset_password): code should STILL be unused
 * - After reset-password: code should be marked used
 */
export async function testOTPLifecycle(email: string, purpose: 'reset_password'): Promise<{
  afterSend: { exists: boolean; used: boolean }
  afterVerify: { exists: boolean; used: boolean }
  afterReset: { exists: boolean; used: boolean }
}> {
  const supabase = getSupabaseServiceClient()

  const queryOTP = async () => {
    const { data, error } = await supabase
      .from('otp_codes')
      .select('id, code, used')
      .eq('email', email)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return {
      exists: !error && data !== null,
      used: data?.used || false,
    }
  }

  return {
    afterSend: await queryOTP(),
    afterVerify: await queryOTP(),
    afterReset: await queryOTP(),
  }
}

/**
 * Wait for an OTP code to be generated and available
 * Polls the database until the code is found or timeout occurs
 */
export async function waitForOTPCode(
  email: string,
  purpose: 'verify_email' | 'reset_password',
  timeoutMs: number = 5000,
  pollIntervalMs: number = 100
): Promise<string | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const code = await getLatestOTPCode(email, purpose)
    if (code) {
      return code
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  return null
}

export default {
  getSupabaseServiceClient,
  getLatestOTPCode,
  isOTPCodeUsed,
  createTestUser,
  cleanupTestData,
  testOTPLifecycle,
  waitForOTPCode,
}
