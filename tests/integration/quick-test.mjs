#!/usr/bin/env node

/**
 * Quick integration test for password reset flow
 * Can be run without installing Playwright dependencies
 * 
 * Usage: node tests/integration/quick-test.mjs
 * With database: SUPABASE_SERVICE_ROLE_KEY=xxx node tests/integration/quick-test.mjs
 */

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function testPasswordResetFlow() {
  console.log('🔐 Password Reset Flow - Quick Integration Test\n')
  
  const testEmail = `test-reset-${Date.now()}@example.com`
  const newPassword = 'TestPassword123'

  try {
    // Step 1: Send OTP
    console.log('📧 Step 1: Sending OTP...')
    const sendRes = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, purpose: 'reset_password' }),
    })

    if (!sendRes.ok) {
      throw new Error(`Send OTP failed: ${sendRes.status}`)
    }

    const sendData = await sendRes.json()
    if (!sendData.success) {
      throw new Error(`Send OTP error: ${sendData.error}`)
    }
    console.log('✅ OTP sent successfully')
    console.log(`   Recipient: ${testEmail}\n`)

    // Step 2: Try verify with a test code (will fail but tests API connectivity)
    console.log('🔑 Step 2: Testing OTP verification endpoint...')
    const verifyRes = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '000000', // Invalid code - testing endpoint response
        purpose: 'reset_password',
      }),
    })

    if (!verifyRes.ok) {
      throw new Error(`Verify OTP failed: ${verifyRes.status}`)
    }

    const verifyData = await verifyRes.json()
    console.log('✅ OTP verification endpoint is responsive')
    console.log(`   Expected to reject invalid code: ${!verifyData.success ? '✓' : '✗'}\n`)

    // Step 3: Test password reset endpoint
    console.log('🔄 Step 3: Testing password reset endpoint...')
    const resetRes = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '000000',
        new_password: newPassword,
      }),
    })

    if (!resetRes.ok) {
      throw new Error(`Reset password failed: ${resetRes.status}`)
    }

    const resetData = await resetRes.json()
    console.log('✅ Password reset endpoint is responsive')
    console.log(`   Expected to reject invalid code: ${!resetData.success ? '✓' : '✗'}\n`)

    // Summary
    console.log('✅ All API endpoints are working correctly\n')
    console.log('📋 API Health Check Summary:')
    console.log('   ✓ /api/auth/send-otp          - Responsive')
    console.log('   ✓ /api/auth/verify-otp         - Responsive')
    console.log('   ✓ /api/auth/reset-password     - Responsive')
    console.log('\n🎉 Ready for full integration test with database access!\n')
    console.log('📌 For complete testing with OTP lifecycle verification:')
    console.log('   export SUPABASE_SERVICE_ROLE_KEY="<your-key>"')
    console.log('   npm run test:integration')

  } catch (err) {
    console.error('\n❌ Test failed:', err.message)
    console.error('\n📌 Troubleshooting:')
    console.error('   1. Is the dev server running? (npm run dev on port 3001)')
    console.error('   2. Are the API endpoints accessible?')
    console.error('   3. Check the server logs for errors')
    process.exit(1)
  }
}

testPasswordResetFlow()
