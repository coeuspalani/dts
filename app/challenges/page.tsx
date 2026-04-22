'use client'
import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import ChallengeCard from '@/components/ChallengeCard'
import Toast, { useToast } from '@/components/Toast'
import Spinner from '@/components/Spinner'
import { useAuth } from '@/hooks/useAuth'
import type { Challenge } from '@/lib/types'

export default function ChallengesPage() {
  const { user }                    = useAuth()
  const { toast, show, hide }       = useToast()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [joined, setJoined]         = useState<Record<string, boolean>>({})
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/challenges')
      const data = await res.json()
      if (!data.success) return
      const list: Challenge[] = data.data ?? []
      setChallenges(list)

      // Check join status for all active challenges
      const token = localStorage.getItem('dts_access')
      const joinStatuses: Record<string, boolean> = {}
      await Promise.all(
        list.filter(c => c.status === 'active').map(async c => {
          try {
            const r    = await fetch(`/api/challenges/${c.id}/join`, { headers: { Authorization: `Bearer ${token}` } })
            const d    = await r.json()
            if (d.success) joinStatuses[c.id] = d.data.joined
          } catch {}
        })
      )
      setJoined(joinStatuses)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleJoin = async (challengeId: string) => {
    const token = localStorage.getItem('dts_access')
    const res   = await fetch(`/api/challenges/${challengeId}/join`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    if (data.success) {
      setJoined(prev => ({ ...prev, [challengeId]: true }))
      show(data.data.already_joined ? 'Already participating!' : 'Joined!')
    } else { show(data.error ?? 'Failed to join', 'error') }
  }

  const active   = challenges.filter(c => c.status === 'active')
  const upcoming = challenges.filter(c => c.status === 'upcoming')

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-black">Challenges</h1>
        <p className="text-[10px] font-mono text-muted mt-0.5">// JOIN MULTIPLE CHALLENGES SIMULTANEOUSLY</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20">
          <Spinner size={20} /><span className="text-sm font-mono text-muted">Loading challenges...</span>
        </div>
      ) : (
        <>
          {/* Active */}
          {active.length > 0 && (
            <div className="mb-8 fade-up-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent2 pulse-dot" />
                <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Active Challenges</span>
                <span className="text-[10px] font-mono text-accent2 bg-accent2/10 px-2 py-0.5 rounded-full">{active.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {active.map(c => (
                  <ChallengeCard key={c.id} challenge={c}
                    onJoin={() => handleJoin(c.id)} joined={joined[c.id]} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="fade-up-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Upcoming</span>
                <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full">{upcoming.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map(c => <ChallengeCard key={c.id} challenge={c} />)}
              </div>
            </div>
          )}

          {challenges.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-4xl">🏆</div>
              <p className="text-sm font-mono text-muted">No challenges yet</p>
              {user?.role === 'admin' && (
                <a href="/admin" className="text-xs font-mono text-accent hover:opacity-70 transition-opacity">
                  Create one in Admin →
                </a>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}
