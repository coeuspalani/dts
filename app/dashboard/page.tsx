'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/AppShell'
import StatCard from '@/components/StatCard'
import ChallengeCard from '@/components/ChallengeCard'
import LeaderboardTable from '@/components/LeaderboardTable'
import Toast, { useToast } from '@/components/Toast'
import Spinner from '@/components/Spinner'
import { getLeaderboard, getChallenges } from '@/lib/api-client'
import type { LeaderboardEntry, Challenge } from '@/lib/types'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Link from 'next/link'

interface WeeklyDay { day: string; date: string; solves: number; easy: number; medium: number; hard: number; points: number }

export default function DashboardPage() {
  const { user }                    = useAuth()
  const { toast, show, hide }       = useToast()
  const [lb, setLb]                 = useState<LeaderboardEntry[]>([])
  const [challenge, setChallenge]   = useState<Challenge | null>(null)
  const [syncing, setSyncing]       = useState(false)
  const [joined, setJoined]         = useState(false)
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([])
  const [pageLoading, setPageLoading]   = useState(true)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const myEntry = lb.find(e => e.id === user?.id)

  const fetchWeekly = useCallback(async () => {
    try {
      const token = localStorage.getItem('dts_access')
      const res   = await fetch('/api/users/me/weekly', { headers: { Authorization: `Bearer ${token}` } })
      const json  = await res.json()
      if (json.success) setWeeklyData(json.data)
    } catch {} finally { setWeeklyLoading(false) }
  }, [])

  const load = useCallback(async () => {
    try {
      const [lbData, challengeData] = await Promise.all([
        getLeaderboard({ limit: 5 }),
        getChallenges('active'),
      ])
      setLb(lbData.entries ?? [])
      const activeChallenge = Array.isArray(challengeData) ? challengeData[0] : null
      setChallenge(activeChallenge)
      if (activeChallenge) {
        try {
          const token   = localStorage.getItem('dts_access')
          const joinRes = await fetch(`/api/challenges/${activeChallenge.id}/join`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const joinData = await joinRes.json()
          if (joinData.success) setJoined(joinData.data.joined)
        } catch {}
      }
    } catch {} finally { setPageLoading(false) }
  }, [])

  useEffect(() => { load(); fetchWeekly() }, [load, fetchWeekly])

  const handleSync = async () => {
    if (!user?.leetcode_username) return
    setSyncing(true)
    try {
      const token = localStorage.getItem('dts_access')
      const res   = await fetch('/api/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: user.leetcode_username })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      await load(); await fetchWeekly()
      const me = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      if (me.success) { localStorage.setItem('dts_user', JSON.stringify(me.data)); window.location.reload() }
      show('Synced from LeetCode!')
    } catch (e: any) { show(e.message ?? 'Sync failed', 'error') }
    finally { setSyncing(false) }
  }

  const handleJoin = async () => {
    if (!challenge) return
    const token = localStorage.getItem('dts_access')
    const res   = await fetch(`/api/challenges/${challenge.id}/join`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    if (data.success) {
      setJoined(true)
      show(data.data.already_joined ? 'Already participating!' : 'Joined the challenge!')
    } else { show(data.error ?? 'Failed to join', 'error') }
  }

  const maxSolves = Math.max(...weeklyData.map(d => d.solves), 1)

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black">Dashboard</h1>
          <p className="text-[10px] font-mono text-muted mt-0.5 truncate">
            // {challenge?.title ?? 'NO ACTIVE CHALLENGE'}
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface border border-white/[0.07] rounded-lg text-xs sm:text-sm font-semibold hover:border-accent/40 transition-all disabled:opacity-50">
          {syncing ? <Spinner size={13} /> : <RefreshCw size={13} />}
          <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync LeetCode'}</span>
          <span className="sm:hidden">{syncing ? '...' : 'Sync'}</span>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5 fade-up-1">
        <StatCard loading={pageLoading} label="Rank"   value={myEntry?.rank ? `#${myEntry.rank}` : '—'} sub="global standing" color="gold" />
        <StatCard loading={pageLoading} label="Solves" value={user?.solve_count ?? 0} sub={`${user?.easy_solved ?? 0}E · ${user?.medium_solved ?? 0}M · ${user?.hard_solved ?? 0}H`} color="accent" />
        <StatCard loading={pageLoading} label="Points" value={user?.points ?? 0} sub="E×1 · M×2 · H×3" color="green" />
        <StatCard loading={pageLoading} label="Streak" value={`${user?.streak ?? 0}d`} sub="days in a row 🔥" />
      </div>

      {/* Challenge + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 fade-up-2">
        <div>
          {pageLoading ? (
            <div className="bg-surface border border-white/[0.07] rounded-xl p-5 space-y-3">
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-2 w-32" />
            </div>
          ) : challenge ? (
            <ChallengeCard challenge={challenge} onJoin={handleJoin} joined={joined} />
          ) : (
            <div className="bg-surface border border-white/[0.07] rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] gap-2">
              <div className="text-2xl">🏆</div>
              <p className="text-sm text-muted font-mono">No active challenge</p>
              {user?.role === 'admin' && (
                <Link href="/admin" className="text-xs font-mono text-accent hover:opacity-70 transition-opacity mt-1">
                  Create one in Admin →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Weekly chart */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// solves this week</div>
            <div className="text-[10px] font-mono text-accent2 font-bold">
              {weeklyData.reduce((a, d) => a + d.solves, 0)} total
            </div>
          </div>

          {weeklyLoading ? (
            <div className="h-[110px] flex items-center justify-center">
              <Spinner size={22} />
            </div>
          ) : weeklyData.every(d => d.solves === 0) ? (
            <div className="h-[110px] flex flex-col items-center justify-center gap-2">
              <p className="text-xs font-mono text-muted">No activity yet</p>
              <button onClick={handleSync} disabled={syncing}
                className="text-[11px] font-mono text-accent hover:opacity-70 transition-opacity flex items-center gap-1">
                {syncing ? <Spinner size={10} /> : null}
                Sync to start tracking →
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={weeklyData} barCategoryGap="25%">
                <XAxis dataKey="day" tick={{ fill: '#7c7b90', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, maxSolves + 1]} />
                <Tooltip
                  contentStyle={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 10 }}
                  formatter={(value: any, _: any, props: any) => {
                    const d = props.payload
                    return [`${value} (${d.easy}E ${d.medium}M ${d.hard}H)`, 'Solved']
                  }}
                  labelStyle={{ color: '#7c7b90' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="solves" radius={[3, 3, 0, 0]}>
                  {weeklyData.map((d, i) => (
                    <Cell key={i} fill={d.solves === maxSolves ? '#5de0b0' : '#7c6af7'} opacity={d.solves === 0 ? 0.15 : 0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {!weeklyLoading && weeklyData.some(d => d.solves > 0) && (
            <div className="flex justify-around pt-3 mt-2 border-t border-white/[0.05]">
              {[
                { label: 'Easy',   val: weeklyData.reduce((a,d)=>a+d.easy,0),   color:'text-accent2' },
                { label: 'Medium', val: weeklyData.reduce((a,d)=>a+d.medium,0), color:'text-gold'    },
                { label: 'Hard',   val: weeklyData.reduce((a,d)=>a+d.hard,0),   color:'text-danger'  },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <div className={`text-sm font-bold font-mono ${color}`}>{val}</div>
                  <div className="text-[9px] font-mono text-muted uppercase tracking-widest">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard preview */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden fade-up-3">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/[0.07]">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// top 5</div>
          <Link href="/leaderboard" className="flex items-center gap-1 text-[11px] font-mono text-accent hover:opacity-70 transition-opacity">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <LeaderboardTable entries={lb} currentUserId={user?.id} compact loading={pageLoading} />
      </div>
    </AppShell>
  )
}
