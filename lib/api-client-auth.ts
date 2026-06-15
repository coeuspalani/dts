// Auth-specific API calls — no auto-redirect on 401 for auth routes
async function authFetch(path: string, body: object) {
  const res  = await fetch(path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Request failed')
  return json.data
}

export const sendOTP = (email: string, purpose: string, name?: string) =>
  fetch('/api/auth/send-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose, name }),
  }).then(r => r.json())

export const verifyOTP = (email: string, code: string, purpose: string) =>
  fetch('/api/auth/verify-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, purpose }),
  }).then(r => r.json())

export const resetPassword = (email: string, code: string, new_password: string) =>
  authFetch('/api/auth/reset-password', { email, code, new_password })

export const loginUser = (email: string, password: string) =>
  authFetch('/api/auth/login', { email, password })

export const registerUser = (data: {
  name: string; email: string; password: string
  leetcode_username: string; otp_verified: boolean
}) => authFetch('/api/auth/register', data)
