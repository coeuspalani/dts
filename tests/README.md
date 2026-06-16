# Integration and E2E Testing Guide

This directory contains integration and end-to-end tests for the DTS password reset flow, including the bug fix for "Invalid or expired code" errors.

## Overview

### Bug Fixed
**Issue**: After verifying an OTP code for password reset, the code was immediately marked as "used", causing the password reset endpoint to fail with "Invalid or expired code" error.

**Root Cause**: The `verify-otp` endpoint was consuming OTP codes for all purposes, but the password reset flow requires the code to remain available for the subsequent `reset-password` call.

**Solution**: Modified `verify-otp` to NOT mark codes as used when `purpose === 'reset_password'`. This preserves the code for the password reset endpoint, which then consumes it.

## Running the Tests

### Prerequisites
- Node.js 18+ installed
- Local dev server running: `npm run dev` (starts on http://localhost:3001)
- For full integration tests: Set `SUPABASE_SERVICE_ROLE_KEY` environment variable

### Integration Test (API Layer)

```bash
# Run with API layer only (no database)
npm run test:integration

# Run with database verification
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
npm run test:integration
```

**Test Coverage**:
- Sends OTP to test email
- Verifies OTP code
- Resets password with same code
- Checks that no "expired code" error occurs
- (With database key) Verifies OTP state transitions at each step

**Expected Output** (without database key):
```
🔐 Password Reset Flow Integration Test (Mock Mode)

⚠️  Running in mock mode (no database access)

Step 1: Sending reset OTP...
✅ OTP sent successfully
✅ API layer is responsive
```

**Expected Output** (with database key):
```
🔐 Password Reset Flow Integration Test

Step 1: Sending reset OTP to test-reset-1234567@example.com
✅ OTP sent successfully

Step 2: Waiting for OTP code in database...
✅ OTP code retrieved: 123456

Step 3: Verifying OTP...
✅ OTP verified successfully

Step 4: Verifying OTP code is still unused after verification...
✅ OTP code is still marked as unused (correct!)

Step 5: Resetting password with the same code...
✅ Password reset successfully

✅✅✅ All integration tests passed!
```

### E2E Tests (UI Layer)

```bash
# Run Playwright tests (headless)
npm run test:e2e

# Run with UI (opens browser)
npx playwright test tests/e2e/password-reset.spec.ts --ui

# Run in headed mode (watch flow)
npx playwright test tests/e2e/password-reset.spec.ts --headed

# Run specific test
npx playwright test tests/e2e/password-reset.spec.ts -g "should complete password reset"
```

**Test Coverage**:
- UI flow for password reset initiation
- OTP input focus behavior (no focus loss)
- OTP digit auto-advance to next input
- Paste handling for multi-digit input
- Error message display

**Test Results**: Reports generated in `test-results/` directory with screenshots for failed tests.

## Configuration Files

### `tests/integration/auth-reset-flow-complete.test.ts`
Full integration test that exercises the complete password reset flow via API calls.

- **Without database key**: Tests API connectivity only
- **With database key**: Full lifecycle verification including OTP state transitions

### `tests/e2e/password-reset.spec.ts`
Playwright E2E tests for UI interactions and focus behavior.

### `tests/helpers/database.ts`
Test helpers for database access using Supabase service role. Provides:
- `getLatestOTPCode()` - Fetch most recent OTP
- `waitForOTPCode()` - Poll for code availability
- `isOTPCodeUsed()` - Check OTP state
- `cleanupTestData()` - Remove test data

### `playwright.config.ts`
Playwright configuration for browser testing.

## Setting Up Service Role Access

To enable full integration test with database verification:

1. Go to Supabase dashboard
2. Navigate to Settings → API
3. Copy your **Service Role** key (secret key)
4. Set environment variable:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
   ```
5. Run tests:
   ```bash
   npm run test:integration
   ```

⚠️ **Security**: Never commit `SUPABASE_SERVICE_ROLE_KEY` to version control. Use environment files or CI/CD secrets.

## Test Scenarios

### Scenario 1: Password Reset Without "Expired Code" Error
1. User clicks "Forgot password?"
2. Enters email and requests OTP
3. OTP is sent and stored in database
4. User receives OTP code
5. verify-otp endpoint confirms code is valid (but does NOT mark as used)
6. User enters new password
7. reset-password endpoint accepts same code (code not expired)
8. ✅ Password updated successfully

### Scenario 2: OTP Focus Behavior
1. User navigates to OTP input
2. Types digit "1" → focus advances to next box
3. Types digit "2" → focus advances to next box
4. ... repeats for all 6 digits
5. ✅ No focus loss, no blinking/remounting

### Scenario 3: OTP Code Lifecycle (with database)
- After send-otp: code `used = false` ✓
- After verify-otp (reset_password): code `used = false` ✓ (THIS WAS THE BUG)
- After reset-password: code `used = true` ✓

## Troubleshooting

### Test fails with "Could not retrieve OTP code from database"
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify the key has database access permissions
- Check that Supabase project is accessible

### Playwright tests timeout
- Ensure dev server is running: `npm run dev`
- Check that server is accessible at http://localhost:3001
- Use `--headed` flag to see what's happening: `npx playwright test --headed`

### "Invalid or expired code" error in manual testing
- If you see this after verifying OTP, the fix may not be applied
- Check [app/api/auth/verify-otp/route.ts](../../app/api/auth/verify-otp/route.ts) line ~65:
  ```typescript
  if (purpose !== 'reset_password') {
    await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id)
  }
  ```

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Run integration tests
  env:
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: npm run test:integration

- name: Run E2E tests
  run: npm run test:e2e
```

## Code References

**Fixed Files**:
- [app/api/auth/verify-otp/route.ts](../../app/api/auth/verify-otp/route.ts) - Skip marking reset_password codes as used
- [app/login/page.tsx](../../app/login/page.tsx) - Use localized countdown state
- [components/OTPInput.tsx](../../components/OTPInput.tsx) - Defer focus operations

**Related Test Pages**:
- [app/test-otp/page.tsx](../../app/test-otp/page.tsx) - Manual OTP input testing UI
