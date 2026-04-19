'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/AppShell'
import StatCard from '@/components/StatCard'
import ChallengeCard from '@/components/ChallengeCard'
import LeaderboardTable from '@/components/LeaderboardTable'
import Toast, { useToast } from '@/components/Toast'
import { getLeaderboard, getChallenges, syncMe, joinChallenge } from '@/lib/api-client'
import type { LeaderboardEntry, Challenge } from '@/lib/types'
import { RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function DashboardPage() {
  const { user }                          = useAuth()
  const { toast, show, hide }             = useToast()
  const [lb, setLb]                       = useState<LeaderboardEntry[]>([])
  const [challenge, setChallenge]         = useState<Challenge | null>(null)
  const [syncing, setSyncing]             = useState(false)
  const [joined, setJoined]               = useState(false)

  const myEntry = lb.find(e => e.id === user?.id)

  const barData = [
    { day: 'M', solves: 14 }, { day: 'T', solves: 18 }, { day: 'W', solves: 12 },
    { day: 'T', solves: 22 }, { day: 'F', solves: 8  }, { day: 'S', solves: 16 },
    { day: 'S', solves: (user?.solve_count ?? 0) % 20 || 10 },
  ]

  const load = useCallback(async () => {
    try {
      const [lbData, challengeData] = await Promise.all([
        getLeaderboard({ limit: 5 }),
        getChallenges('active'),
      ])
      setLb(lbData.entries ?? [])
      setChallenge(Array.isArray(challengeData) ? challengeData[0] : null)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    if (!user?.leetcode_username) return
    setSyncing(true)
    try {
      await syncMe(user.leetcode_username)
      await load()
      show('Stats synced from LeetCode!')
      // Refresh user in localStorage
      const me = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('dts_access')}` }
      }).then(r => r.json())
      if (me.success) localStorage.setItem('dts_user', JSON.stringify(me.data))
    } catch (e: any) {
      show(e.message ?? 'Sync failed', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleJoin = async () => {
    if (!challenge) return
    try {
      await joinChallenge(challenge.id)
      setJoined(true)
      show('Joined the challenge!')
    } catch (e: any) {
      show(e.message, 'error')
    }
  }

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="text-[11px] font-mono text-muted mt-0.5">
            // {challenge?.title ?? 'NO ACTIVE CHALLENGE'}
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/[0.07] rounded-lg text-sm font-semibold hover:border-accent/40 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync LeetCode'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Current Rank"  value={myEntry?.rank ? `#${myEntry.rank}` : '—'} sub="global" color="gold" />
        <StatCard label="Total Solves"  value={user?.solve_count ?? 0} sub={`${user?.easy_solved ?? 0}E · ${user?.medium_solved ?? 0}M · ${user?.hard_solved ?? 0}H`} color="accent" />
        <StatCard label="Total Points"  value={user?.points ?? 0} sub="Easy×1 · Med×2 · Hard×3" color="green" />
        <StatCard label="Streak"        value={`${user?.streak ?? 0}d`} sub="days in a row 🔥" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Challenge card */}
        <div>
          {challenge
            ? <ChallengeCard challenge={challenge} onJoin={handleJoin} joined={joined} />
            : (
              <div className="bg-surface border border-white/[0.07] rounded-xl p-6 flex items-center justify-center h-full">
                <p className="text-sm text-muted font-mono">No active challenge</p>
              </div>
            )
          }
        </div>

        {/* Solve chart */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4">// solves this week</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={barData} barCategoryGap="25%">
              <XAxis dataKey="day" tick={{ fill: '#7c7b90', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 }}
                itemStyle={{ color: '#5de0b0' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="solves" radius={[3, 3, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={i === 3 ? '#5de0b0' : '#7c6af7'} opacity={i === 3 ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard preview */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// leaderboard preview</div>
          <a href="/leaderboard" className="text-[11px] font-mono text-accent hover:opacity-70 transition-opacity">
            View all →
          </a>
        </div>
        {lb.length > 0
          ? <LeaderboardTable entries={lb} currentUserId={user?.id} compact />
          : <div className="p-8 text-center text-sm text-muted font-mono">Loading...</div>
        }
      </div>
    </AppShell>
  )
}
