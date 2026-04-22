'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/AppShell'
import StatCard from '@/components/StatCard'
import ChallengeCard from '@/components/ChallengeCard'
import LeaderboardTable from '@/components/LeaderboardTable'
import Toast, { useToast } from '@/components/Toast'
import Spinner from '@/components/Spinner'
import type { LeaderboardEntry } from '@/lib/types'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Link from 'next/link'

interface DashChallenge {
  id: string; title: string; status: string
  start_date: string; end_date: string; duration_days: number
  joined: boolean; solve_count_at_start: number; points_earned: number
}
interface WeeklyDay { day: string; date: string; solves: number; easy: number; medium: number; hard: number; points: number }

export default function DashboardPage() {
  const { user }                    = useAuth()
  const { toast, show, hide }       = useToast()
  const [lb, setLb]                 = useState<LeaderboardEntry[]>([])
  const [challenges, setChallenges] = useState<DashChallenge[]>([])
  const [syncing, setSyncing]       = useState(false)
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([])
  const [pageLoading, setPageLoading]     = useState(true)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const myEntry = lb.find(e => e.id === user?.id)

  const getToken = () => localStorage.getItem('dts_access')

  const fetchWeekly = useCallback(async () => {
    try {
      const res  = await fetch('/api/users/me/weekly', { headers: { Authorization: `Bearer ${getToken()}` } })
      const json = await res.json()
      if (json.success) setWeeklyData(json.data)
    } catch {} finally { setWeeklyLoading(false) }
  }, [])

  // Single API call replaces leaderboard + challenges + N join-status checks
  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${getToken()}` } })
      const json = await res.json()
      if (json.success) {
        setLb(json.data.leaderboard ?? [])
        setChallenges((json.data.challenges ?? []).filter((c: DashChallenge) => c.status === 'active'))
      }
    } catch {} finally { setPageLoading(false) }
  }, [])

  useEffect(() => { load(); fetchWeekly() }, [load, fetchWeekly])

  const handleSync = async () => {
    if (!user?.leetcode_username) return
    setSyncing(true)
    try {
      const res  = await fetch('/api/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: user.leetcode_username })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Refresh everything in parallel
      await Promise.all([load(), fetchWeekly()])

      // Update cached user data
      const me = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json())
      if (me.success) { localStorage.setItem('dts_user', JSON.stringify(me.data)); window.location.reload() }
      show('Synced from LeetCode!')
    } catch (e: any) { show(e.message ?? 'Sync failed', 'error') }
    finally { setSyncing(false) }
  }

  const handleJoin = async (challengeId: string) => {
    const res  = await fetch(`/api/challenges/${challengeId}/join`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    if (data.success) {
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, joined: true } : c))
      show(data.data.already_joined ? 'Already participating!' : 'Joined!')
    } else { show(data.error ?? 'Failed', 'error') }
  }

  const activeChallenges = challenges.filter(c => c.status === 'active')
  const maxSolves = Math.max(...weeklyData.map(d => d.solves), 1)

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="flex items-start sm:items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Dashboard</h1>
          <p className="text-[10px] font-mono text-muted mt-0.5">
            // {activeChallenges.length > 0 ? `${activeChallenges.length} ACTIVE CHALLENGE${activeChallenges.length > 1 ? 'S' : ''}` : 'NO ACTIVE CHALLENGES'}
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface border border-white/[0.07] rounded-lg text-xs sm:text-sm font-semibold hover:border-accent/40 transition-all disabled:opacity-50">
          {syncing ? <Spinner size={13} /> : <RefreshCw size={13} />}
          <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync LeetCode'}</span>
          <span className="sm:hidden">{syncing ? '...' : 'Sync'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 fade-up-1">
        <StatCard loading={pageLoading} label="Rank"   value={myEntry?.rank ? `#${myEntry.rank}` : '—'} sub="global standing" color="gold" />
        <StatCard loading={pageLoading} label="Solves" value={user?.solve_count ?? 0} sub={`${user?.easy_solved ?? 0}E · ${user?.medium_solved ?? 0}M · ${user?.hard_solved ?? 0}H`} color="accent" />
        <StatCard loading={pageLoading} label="Points" value={user?.points ?? 0} sub="E×1 · M×2 · H×3" color="green" />
        <StatCard loading={pageLoading} label="Streak" value={`${user?.streak ?? 0}d`} sub="days in a row 🔥" />
      </div>

      {/* Active challenges */}
      <div className="mb-4 fade-up-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest flex items-center gap-2">
            {activeChallenges.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-accent2 pulse-dot" />}
            // active challenges
          </div>
          <Link href="/challenges" className="flex items-center gap-1 text-[11px] font-mono text-accent hover:opacity-70 transition-opacity">
            All <ArrowRight size={11} />
          </Link>
        </div>
        {pageLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1].map(i => <div key={i} className="bg-surface border border-white/[0.07] rounded-xl p-5 space-y-3"><div className="skeleton h-4 w-16" /><div className="skeleton h-5 w-48" /><div className="skeleton h-2 w-full" /></div>)}
          </div>
        ) : activeChallenges.length > 0 ? (
          <div className={`grid gap-3 ${activeChallenges.length === 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {activeChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c as any} onJoin={() => handleJoin(c.id)} joined={c.joined} />
            ))}
          </div>
        ) : (
          <div className="bg-surface border border-white/[0.07] rounded-xl p-6 flex flex-col items-center justify-center gap-2 min-h-[100px]">
            <p className="text-sm text-muted font-mono">No active challenges</p>
            {user?.role === 'admin' && <Link href="/admin" className="text-xs font-mono text-accent hover:opacity-70">Create one →</Link>}
          </div>
        )}
      </div>

      {/* Weekly chart */}
      <div className="bg-surface border border-white/[0.07] rounded-xl p-4 sm:p-5 mb-4 fade-up-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// solves this week</div>
          <div className="text-[10px] font-mono text-accent2 font-bold">{weeklyData.reduce((a,d)=>a+d.solves,0)} total</div>
        </div>
        {weeklyLoading ? (
          <div className="h-[100px] flex items-center justify-center"><Spinner size={20} /></div>
        ) : weeklyData.every(d => d.solves === 0) ? (
          <div className="h-[100px] flex flex-col items-center justify-center gap-2">
            <p className="text-xs font-mono text-muted">No activity tracked yet</p>
            <button onClick={handleSync} disabled={syncing} className="text-[11px] font-mono text-accent hover:opacity-70 flex items-center gap-1">
              {syncing && <Spinner size={10} />} Sync to start tracking →
            </button>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={weeklyData} barCategoryGap="25%">
                <XAxis dataKey="day" tick={{ fill:'#7c7b90', fontSize:9, fontFamily:'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, maxSolves + 1]} />
                <Tooltip contentStyle={{ background:'#16161f', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontFamily:'Space Mono', fontSize:10 }}
                  formatter={(v:any,_:any,p:any) => [`${v} (${p.payload.easy}E ${p.payload.medium}M ${p.payload.hard}H)`,'Solved']}
                  labelStyle={{ color:'#7c7b90' }} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="solves" radius={[3,3,0,0]}>
                  {weeklyData.map((d,i)=><Cell key={i} fill={d.solves===maxSolves?'#5de0b0':'#7c6af7'} opacity={d.solves===0?0.15:0.85}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-around pt-3 mt-2 border-t border-white/[0.05]">
              {[['Easy',weeklyData.reduce((a,d)=>a+d.easy,0),'text-accent2'],['Med',weeklyData.reduce((a,d)=>a+d.medium,0),'text-gold'],['Hard',weeklyData.reduce((a,d)=>a+d.hard,0),'text-danger']].map(([l,v,c])=>(
                <div key={l as string} className="text-center">
                  <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
                  <div className="text-[9px] font-mono text-muted uppercase tracking-widest">{l}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Leaderboard preview */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden fade-up-4">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/[0.07]">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// global top 5</div>
          <Link href="/leaderboard" className="flex items-center gap-1 text-[11px] font-mono text-accent hover:opacity-70 transition-opacity">
            Full board <ArrowRight size={11} />
          </Link>
        </div>
        <LeaderboardTable entries={lb} currentUserId={user?.id} compact loading={pageLoading} />
      </div>
    </AppShell>
  )
}
