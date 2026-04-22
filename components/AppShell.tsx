'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import { PageLoader } from './Spinner'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) { router.push('/login'); return }
      const t = setTimeout(() => setReady(true), 80)
      return () => clearTimeout(t)
    }
  }, [user, loading, router])

  if (loading || !user) return <PageLoader label="Authenticating..." />
  if (!ready)           return <PageLoader label="Loading..." />

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      {/* Content — offset by mobile top bar height on small screens */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}
