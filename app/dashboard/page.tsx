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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface WeeklyDay {
  day: string
  date: string
  solves: number
  easy: number
  medium: number
  hard: number
  points: number
}

export default function DashboardPage() {
  const { user }                    = useAuth()
  const { toast, show, hide }       = useToast()
  const [lb, setLb]                 = useState<LeaderboardEntry[]>([])
  const [challenge, setChallenge]   = useState<Challenge | null>(null)
  const [syncing, setSyncing]       = useState(false)
  const [joined, setJoined]         = useState(false)
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(true)

  const myEntry = lb.find(e => e.id === user?.id)

  const fetchWeekly = useCallback(async () => {
    try {
      const token = localStorage.getItem('dts_access')
      const res = await fetch('/api/users/me/weekly', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.success) setWeeklyData(json.data)
    } catch {}
    finally { setWeeklyLoading(false) }
  }, [])

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

  useEffect(() => {
    load()
    fetchWeekly()
  }, [load, fetchWeekly])

  const handleSync = async () => {
    if (!user?.leetcode_username) return
    setSyncing(true)
    try {
      await syncMe(user.leetcode_username)
      await load()
      await fetchWeekly()
      show('Stats synced from LeetCode!')
      // Refresh user in localStorage
      const token = localStorage.getItem('dts_access')
      const me = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())
      if (me.success) {
        localStorage.setItem('dts_user', JSON.stringify(me.data))
        window.location.reload()
      }
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

  const maxSolves = Math.max(...weeklyData.map(d => d.solves), 1)

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
              <div className="bg-surface border border-white/[0.07] rounded-xl p-6 flex items-center justify-center h-full min-h-[180px]">
                <p className="text-sm text-muted font-mono">No active challenge</p>
              </div>
            )
          }
        </div>

        {/* Solve chart — real data */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// solves this week</div>
            <div className="text-[10px] font-mono text-muted">
              {weeklyData.reduce((a, d) => a + d.solves, 0)} total
            </div>
          </div>

          {weeklyLoading ? (
            <div className="h-[120px] flex items-center justify-center text-xs font-mono text-muted animate-pulse2">
              Loading...
            </div>
          ) : weeklyData.every(d => d.solves === 0) ? (
            <div className="h-[120px] flex flex-col items-center justify-center gap-2">
              <p className="text-xs font-mono text-muted">No syncs recorded yet</p>
              <button onClick={handleSync}
                className="text-[11px] font-mono text-accent hover:opacity-70 transition-opacity">
                Sync now to start tracking →
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weeklyData} barCategoryGap="25%">
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#7c7b90', fontSize: 10, fontFamily: 'Space Mono' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide domain={[0, maxSolves + 1]} />
                <Tooltip
                  contentStyle={{
                    background: '#16161f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontFamily: 'Space Mono',
                    fontSize: 11
                  }}
                  formatter={(value: any, _: any, props: any) => {
                    const d = props.payload
                    return [
                      `${value} solves (${d.easy}E ${d.medium}M ${d.hard}H)`,
                      'Problems solved'
                    ]
                  }}
                  labelStyle={{ color: '#7c7b90' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="solves" radius={[3, 3, 0, 0]}>
                  {weeklyData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.solves === maxSolves ? '#5de0b0' : '#7c6af7'}
                      opacity={d.solves === 0 ? 0.2 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Weekly breakdown */}
          {!weeklyLoading && weeklyData.some(d => d.solves > 0) && (
            <div className="flex justify-around mt-3 pt-3 border-t border-white/[0.05]">
              {[
                { label: 'Easy',   val: weeklyData.reduce((a,d) => a+d.easy,   0), color: 'text-accent2' },
                { label: 'Medium', val: weeklyData.reduce((a,d) => a+d.medium, 0), color: 'text-gold'    },
                { label: 'Hard',   val: weeklyData.reduce((a,d) => a+d.hard,   0), color: 'text-danger'  },
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
