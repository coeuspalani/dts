'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import { PageLoader } from './Spinner'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const didRedirect       = useRef(false)

  useEffect(() => {
    if (loading) return
    // Redirect to login if no user and haven't already redirected
    if (!user && !didRedirect.current) {
      didRedirect.current = true
      router.replace('/login')
    }
  }, [user, loading, router])

  // Still loading auth state
  if (loading) return <PageLoader label="Loading..." />

  // No user — either sidebar already redirected or useEffect will
  // Return null to avoid rendering dashboard content without auth
  if (!user) return null

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
