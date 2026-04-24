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

        // Decode JWT to check expiry — no network needed
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          if (Date.now() < payload.exp * 1000) {
            // Token still valid — restore instantly
            if (mountedRef.current) {
              setUser(JSON.parse(storedUser))
              setLoading(false)
            }
            return
          }
        } catch {
          // Malformed token — fall through to clear
        }

        // Access token expired — try silent refresh
        const refresh = localStorage.getItem('dts_refresh')
        if (refresh) {
          try {
            const res  = await fetch('/api/auth/refresh', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ refresh_token: refresh }),
            })
            const data = await res.json()
            if (data.success) {
              localStorage.setItem('dts_access',  data.data.access_token)
              localStorage.setItem('dts_refresh', data.data.refresh_token)
              if (mountedRef.current) {
                setUser(JSON.parse(storedUser))
                setLoading(false)
              }
              return
            }
          } catch {
            // Network error — still show user for offline tolerance
            if (mountedRef.current) {
              setUser(JSON.parse(storedUser))
              setLoading(false)
            }
            return
          }
        }

        // Refresh failed — clear everything
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

  const logout = useCallback(async () => {
    // Clear storage first — synchronously — before any async or state updates
    localStorage.removeItem('dts_user')
    localStorage.removeItem('dts_access')
    localStorage.removeItem('dts_refresh')
    // Fire-and-forget the API call — don't await it
    apiLogout().catch(() => {})
    // Update state only if still mounted
    if (mountedRef.current) setUser(null)
  }, [])

  return { user, loading, login, register, logout }
}
