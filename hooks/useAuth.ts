'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/lib/api-client'
import type { User } from '@/lib/types'

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef            = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const restore = async () => {
      try {
        const storedUser  = localStorage.getItem('dts_user')
        const accessToken = localStorage.getItem('dts_access')

        if (!storedUser || !accessToken) {
          if (mountedRef.current) setLoading(false)
          return
        }

        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          if (Date.now() < payload.exp * 1000) {
            if (mountedRef.current) {
              setUser(JSON.parse(storedUser))
              setLoading(false)
            }
            return
          }
        } catch {}

        // Token expired — try silent refresh
        const refresh = localStorage.getItem('dts_refresh')
        if (refresh) {
          try {
            const res  = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refresh }),
            })
            const data = await res.json()
            if (data.success) {
              localStorage.setItem('dts_access',  data.data.access_token)
              localStorage.setItem('dts_refresh', data.data.refresh_token)
              if (mountedRef.current) { setUser(JSON.parse(storedUser)); setLoading(false) }
              return
            }
          } catch {
            // Network error — restore from cache anyway
            if (mountedRef.current) { setUser(JSON.parse(storedUser)); setLoading(false) }
            return
          }
        }

        // All failed — clear
        localStorage.removeItem('dts_user')
        localStorage.removeItem('dts_access')
        localStorage.removeItem('dts_refresh')
      } catch {}
      if (mountedRef.current) setLoading(false)
    }
    restore()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    if (mountedRef.current) setUser(u)
    return u
  }, [])

  const register = useCallback(async (data: {
    name: string; email: string; password: string; leetcode_username: string
  }) => {
    const u = await apiRegister(data)
    if (mountedRef.current) setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('dts_user')
    localStorage.removeItem('dts_access')
    localStorage.removeItem('dts_refresh')
    apiLogout().catch(() => {})
    if (mountedRef.current) setUser(null)
  }, [])

  // ── refreshUser: fetch latest data from DB and update state + localStorage ──
  // Call this after sync to make stats cards immediately show new values
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('dts_access')
      if (!token) return
      const res  = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.success && mountedRef.current) {
        localStorage.setItem('dts_user', JSON.stringify(json.data))
        setUser(json.data)
      }
    } catch {}
  }, [])

  return { user, loading, login, register, logout, refreshUser }
}
