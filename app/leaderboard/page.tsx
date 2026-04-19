'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import LeaderboardTable from '@/components/LeaderboardTable'
import { useAuth } from '@/hooks/useAuth'
import { getLeaderboard, getChallenges } from '@/lib/api-client'
import type { LeaderboardEntry, Challenge } from '@/lib/types'

export default function LeaderboardPage() {
  const { user }                              = useAuth()
  const [entries, setEntries]                 = useState<LeaderboardEntry[]>([])
  const [challenges, setChallenges]           = useState<Challenge[]>([])
  const [selectedChallenge, setSelected]      = useState<string>('')
  const [total, setTotal]                     = useState(0)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    getChallenges().then((data: Challenge[]) => {
      setChallenges(data ?? [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getLeaderboard({ challenge_id: selectedChallenge || undefined, limit: 100 })
      .then(data => {
        setEntries(data.entries ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedChallenge])

  const myRank = entries.find(e => e.id === user?.id)?.rank

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black">Leaderboard</h1>
          <p className="text-[11px] font-mono text-muted mt-0.5">
            // {total} COMPETITORS RANKED
          </p>
        </div>
        {myRank && (
          <div className="bg-surface border border-white/[0.07] rounded-xl px-5 py-3 text-center">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">your rank</div>
            <div className="text-2xl font-black text-gold">#{myRank}</div>
          </div>
        )}
      </div>

      {/* Points legend */}
      <div className="flex gap-4 mb-6">
        {[['Easy', '1 pt', 'text-accent2'], ['Medium', '2 pts', 'text-gold'], ['Hard', '3 pts', 'text-danger']].map(([d, p, c]) => (
          <div key={d} className="bg-surface border border-white/[0.07] rounded-lg px-4 py-2 flex items-center gap-2">
            <span className={`text-xs font-bold ${c}`}>{d}</span>
            <span className="text-xs font-mono text-muted">= {p}</span>
          </div>
        ))}
        <div className="ml-auto">
          <select value={selectedChallenge} onChange={e => setSelected(e.target.value)}
            className="px-3 py-2 text-sm font-mono text-sm">
            <option value="">Global Rankings</option>
            {challenges.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[entries[1], entries[0], entries[2]].map((e, i) => {
            const heights = ['h-24', 'h-32', 'h-20']
            const colors  = ['bg-white/10', 'bg-gold/10', 'bg-orange-500/10']
            const texts   = ['text-white/70', 'text-gold', 'text-orange-400']
            const labels  = ['2nd', '1st', '3rd']
            return (
              <div key={e.id} className={`${colors[i]} border border-white/[0.07] rounded-xl flex flex-col items-center justify-end pb-4 ${heights[i]} relative`}>
                <div className={`text-3xl font-black ${texts[i]} mb-1`}>{labels[i]}</div>
                <div className="text-sm font-bold">{e.name}</div>
                <div className={`text-xs font-mono font-bold mt-0.5 ${texts[i]}`}>{e.points} pts</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        {loading
          ? <div className="p-12 text-center text-sm text-muted font-mono animate-pulse2">Loading rankings...</div>
          : entries.length === 0
            ? <div className="p-12 text-center text-sm text-muted font-mono">No data yet</div>
            : <LeaderboardTable entries={entries} currentUserId={user?.id} />
        }
      </div>

      <p className="text-[10px] font-mono text-muted mt-4 text-right">
        Auto-syncs from LeetCode every 5 min
      </p>
    </AppShell>
  )
}
