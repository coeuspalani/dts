'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import { PageLoader } from './Spinner'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [ready, setReady] = useState(false)
  const redirectedRef     = useRef(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      // Only redirect once — prevents double-navigation crash
      if (!redirectedRef.current) {
        redirectedRef.current = true
        router.replace('/login')
      }
      return
    }

    // User is logged in — small delay to avoid flash
    const t = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(t)
  }, [user, loading, router])

  // Still checking auth
  if (loading) return <PageLoader label="Loading..." />

  // No user — show nothing while redirect happens (prevents flash + unmount errors)
  if (!user) return null

  // User exists but page not ready yet
  if (!ready) return <PageLoader label="Loading..." />

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}
