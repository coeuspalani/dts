'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import { PageLoader } from './Spinner'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const redirectedRef     = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!user && !redirectedRef.current) {
      redirectedRef.current = true
      router.replace('/login')
    }
  }, [user, loading, router])

  // Show loader while checking auth OR while redirect is in flight
  if (loading || (!user && !redirectedRef.current)) return <PageLoader label="Loading..." />
  if (!user) return null  // redirect in progress — render nothing

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
