'use client'
import { useEffect } from 'react'

/**
 * Hook to listen for sync completion events
 * Call the callback whenever a user syncs their LeetCode data
 */
export function useSyncListener(callback: () => void) {
  useEffect(() => {
    const handleSync = () => {
      console.log('[useSyncListener] Sync detected, refreshing data')
      callback()
    }

    window.addEventListener('auth-user-changed', handleSync)
    return () => window.removeEventListener('auth-user-changed', handleSync)
  }, [callback])
}
