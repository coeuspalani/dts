const BASE = ''

function getTokens() {
  if (typeof window === 'undefined') return { access: '', refresh: '' }
  return {
    access:  localStorage.getItem('dts_access')  ?? '',
    refresh: localStorage.getItem('dts_refresh') ?? '',
  }
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('dts_access',  access)
  localStorage.setItem('dts_refresh', refresh)
}

export function clearTokens() {
  localStorage.removeItem('dts_access')
  localStorage.removeItem('dts_refresh')
  localStorage.removeItem('dts_user')
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
    if (!res.ok) return false
    const { data } = await res.json()
    setTokens(data.access_token, data.refresh_token)
    return true
  } catch { return false }
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
    if (refreshed) return apiFetch(path, options, false)
    clearTokens()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired')
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Request failed')
  return json.data as T
}

export async function register(body: { name: string; email: string; password: string; leetcode_username: string }) {
  const data = await apiFetch<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) })
  setTokens(data.access_token, data.refresh_token)
  localStorage.setItem('dts_user', JSON.stringify(data.user))
  return data.user
}

export async function login(email: string, password: string) {
  const data = await apiFetch<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  setTokens(data.access_token, data.refresh_token)
  localStorage.setItem('dts_user', JSON.stringify(data.user))
  return data.user
}

export async function logout() {
  const { refresh } = getTokens()
  try { await apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) }) } catch {}
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
