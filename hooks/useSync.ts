'use client'
import { useState, useCallback } from 'react'

export interface SyncResult {
  username:    string
  name:        string
  totalSolved: number
  easySolved:  number
  medSolved:   number
  hardSolved:  number
  points:      number
  db_updated:  boolean
}

export interface SyncResponse {
  success:   boolean
  synced:    number
  failed:    number
  synced_at: string
  results:   SyncResult[]
  errors:    { username: string; error: string }[]
}

export function useSync() {
  const [syncing, setSyncing]   = useState(false)
  const [lastSync, setLastSync] = useState<SyncResponse | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const syncUser = useCallback(async (leetcode_username: string): Promise<SyncResponse | null> => {
    setSyncing(true)
    setError(null)

    try {
      const token = localStorage.getItem('dts_access')
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/sync', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ leetcode_username }),
      })

      const data: SyncResponse = await res.json()

      if (!data.success) {
        // Check if it's a LeetCode connectivity issue vs a DB issue
        const err = data.errors?.[0]?.error ?? 'Sync failed'
        throw new Error(err)
      }

      setLastSync(data)
      return data
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setSyncing(false)
    }
  }, [])

  const syncAll = useCallback(async (): Promise<SyncResponse | null> => {
    setSyncing(true)
    setError(null)

    try {
      const token = localStorage.getItem('dts_access')
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/sync', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({}),
      })

      const data: SyncResponse = await res.json()
      if (!data.success && data.synced === 0) {
        throw new Error(data.errors?.[0]?.error ?? 'Sync failed')
      }

      setLastSync(data)
      return data
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setSyncing(false)
    }
  }, [])

  return { syncing, lastSync, error, syncUser, syncAll }
}
