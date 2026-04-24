'use client'
import { useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/lib/api-client'
import type { User } from '@/lib/types'

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from localStorage immediately (no network call)
    try {
      const storedUser  = localStorage.getItem('dts_user')
      const accessToken = localStorage.getItem('dts_access')

      if (storedUser && accessToken) {
        // Verify token is not obviously expired before trusting it
        // JWT format: header.payload.signature
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          const expiry  = payload.exp * 1000  // ms
          if (Date.now() < expiry) {
            // Token still valid — restore session instantly, no network
            setUser(JSON.parse(storedUser))
          } else {
            // Access token expired — try to refresh silently
            const refresh = localStorage.getItem('dts_refresh')
            if (refresh) {
              fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refresh }),
              })
                .then(r => r.json())
                .then(data => {
                  if (data.success) {
                    localStorage.setItem('dts_access',  data.data.access_token)
                    localStorage.setItem('dts_refresh', data.data.refresh_token)
                    // Keep existing user object — no profile fetch needed
                    setUser(JSON.parse(storedUser))
                  } else {
                    // Refresh also failed — clear everything
                    localStorage.removeItem('dts_user')
                    localStorage.removeItem('dts_access')
                    localStorage.removeItem('dts_refresh')
                  }
                })
                .catch(() => {
                  // Network error — still restore user for offline-ish UX
                  setUser(JSON.parse(storedUser))
                })
                .finally(() => setLoading(false))
              return  // setLoading(false) handled in .finally()
            } else {
              localStorage.removeItem('dts_user')
              localStorage.removeItem('dts_access')
            }
          }
        } catch {
          // Malformed token — clear
          localStorage.removeItem('dts_user')
          localStorage.removeItem('dts_access')
          localStorage.removeItem('dts_refresh')
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (data: {
    name: string; email: string; password: string; leetcode_username: string
  }) => {
    const u = await apiRegister(data)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return { user, loading, login, register, logout }
}
