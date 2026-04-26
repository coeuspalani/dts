const BASE = ''

// Decode JWT payload without verification (for expiry checking only)
function decodeJWT(token: string): { exp: number } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function getTokens() {
  if (typeof window === 'undefined') return { access: '', refresh: '' }
  return {
    access:  localStorage.getItem('dts_access')  ?? '',
    refresh: localStorage.getItem('dts_refresh') ?? '',
  }
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('dts_access',  access)
  localStorage.setItem('dts_refresh', refresh)
  // Notify listeners of token change
  window.dispatchEvent(new CustomEvent('auth-tokens-changed', { detail: { access, refresh } }))
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('dts_user')
  return stored ? JSON.parse(stored) : null
}

export function setUser(user: any) {
  if (typeof window === 'undefined') return
  localStorage.setItem('dts_user', JSON.stringify(user))
  window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: user }))
}

export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('dts_access')
  localStorage.removeItem('dts_refresh')
  localStorage.removeItem('dts_user')
  window.dispatchEvent(new CustomEvent('auth-cleared'))
}

// Check if access token is still valid (not expired)
export function isAccessTokenValid(): boolean {
  const { access } = getTokens()
  if (!access) return false
  const payload = decodeJWT(access)
  return payload ? Date.now() < payload.exp * 1000 : false
}

async function refreshTokens(): Promise<boolean> {
  const { refresh } = getTokens()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) {
      console.error('[Auth] Refresh failed:', res.status, res.statusText)
      return false
    }
    const json = await res.json()
    if (!json.success) {
      console.error('[Auth] Refresh returned success=false:', json.error)
      return false
    }
    const { data } = json
    setTokens(data.access_token, data.refresh_token)
    return true
  } catch (err) {
    console.error('[Auth] Refresh error:', err)
    return false
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { access } = getTokens()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (res.status === 401 && retry) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      // Retry once with new token
      return apiFetch(path, options, false)
    }
    // Refresh failed — clear auth and signal logout
    clearTokens()
    if (typeof window !== 'undefined') {
      // Use router event instead of location.href for better Next.js integration
      window.dispatchEvent(new CustomEvent('auth-expired'))
    }
    throw new Error('Session expired')
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Request failed')
  return json.data as T
}

export async function register(body: { name: string; email: string; password: string; leetcode_username: string }) {
  const data = await apiFetch<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) })
  setTokens(data.access_token, data.refresh_token)
  setUser(data.user)
  return data.user
}

export async function login(email: string, password: string) {
  const data = await apiFetch<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  setTokens(data.access_token, data.refresh_token)
  setUser(data.user)
  return data.user
}

export async function logout() {
  const { refresh } = getTokens()
  try { await apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) }) } catch (err) {
    console.error('[Auth] Logout API error:', err)
  }
  clearTokens()
}

export const getMe = () => apiFetch<any>('/api/users/me')
export const getUserStats = (id: string) => apiFetch<any>(`/api/users/${id}`)

export const getLeaderboard = (params?: { challenge_id?: string; limit?: number }) => {
  const q = new URLSearchParams()
  if (params?.challenge_id) q.set('challenge_id', params.challenge_id)
  if (params?.limit) q.set('limit', String(params.limit))
  return apiFetch<any>(`/api/leaderboard?${q}`)
}

export const getChallenges   = (status?: string) => apiFetch<any>(`/api/challenges${status ? `?status=${status}` : ''}`)
export const createChallenge = (body: any) => apiFetch<any>('/api/challenges', { method: 'POST', body: JSON.stringify(body) })
export const updateChallenge = (id: string, body: any) => apiFetch<any>(`/api/challenges/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteChallenge = (id: string) => apiFetch<any>(`/api/challenges/${id}`, { method: 'DELETE' })
export const joinChallenge   = (id: string) => apiFetch<any>(`/api/challenges/${id}/join`, { method: 'POST' })
export const syncMe          = (leetcode_username: string) => apiFetch<any>('/api/sync', { method: 'POST', body: JSON.stringify({ leetcode_username }) })
export const getAdminStats   = () => apiFetch<any>('/api/admin/stats')
export const getAdminUsers   = () => apiFetch<any>('/api/admin/users')
export const getAdminChallengeLeaderboard = (id: string) => apiFetch<any>(`/api/admin/challenges/${id}/leaderboard`)
