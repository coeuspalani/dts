'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import LeaderboardTable from '@/components/LeaderboardTable'
import Spinner from '@/components/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { getLeaderboard, getChallenges } from '@/lib/api-client'
import type { LeaderboardEntry, Challenge } from '@/lib/types'

export default function LeaderboardPage() {
  const { user }                           = useAuth()
  const [entries, setEntries]              = useState<LeaderboardEntry[]>([])
  const [challenges, setChallenges]        = useState<Challenge[]>([])
  const [selectedChallenge, setSelected]   = useState('')
  const [total, setTotal]                  = useState(0)
  const [loading, setLoading]              = useState(true)

  useEffect(() => {
    getChallenges().then((d: Challenge[]) => setChallenges(d ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getLeaderboard({ challenge_id: selectedChallenge || undefined, limit: 100 })
      .then(d => { setEntries(d.entries ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedChallenge])

  const myRank = entries.find(e => e.id === user?.id)?.rank
  const top3   = entries.slice(0, 3)

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Leaderboard</h1>
          <p className="text-[10px] font-mono text-muted mt-0.5">
            {loading ? '// LOADING...' : `// ${total} COMPETITORS`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {myRank && (
            <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-2 text-center">
              <div className="text-[9px] font-mono text-muted uppercase tracking-widest">your rank</div>
              <div className="text-xl font-black text-gold">#{myRank}</div>
            </div>
          )}
          <select value={selectedChallenge} onChange={e => setSelected(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm font-mono rounded-lg">
            <option value="">Global</option>
            {challenges.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      {/* Points badges */}
      <div className="flex gap-2 flex-wrap mb-5 fade-up-1">
        {[['Easy','1pt','text-accent2','border-accent2/20 bg-accent2/5'],
          ['Medium','2pts','text-gold','border-gold/20 bg-gold/5'],
          ['Hard','3pts','text-danger','border-danger/20 bg-danger/5']].map(([d,p,c,bg]) => (
          <div key={d} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${bg}`}>
            <span className={`font-bold ${c}`}>{d}</span>
            <span className="text-muted">= {p}</span>
          </div>
        ))}
      </div>

      {/* Podium — desktop only */}
      {!loading && top3.length >= 3 && (
        <div className="hidden sm:grid grid-cols-3 gap-3 mb-5 fade-up-2">
          {[top3[1], top3[0], top3[2]].map((e, i) => {
            const cfg = [
              { h: 'h-20', bg: 'bg-white/[0.03]',   border: 'border-white/10',    text: 'text-white/60', label: '2nd', emoji: '🥈' },
              { h: 'h-28', bg: 'bg-gold/[0.06]',     border: 'border-gold/20',     text: 'text-gold',     label: '1st', emoji: '🥇' },
              { h: 'h-16', bg: 'bg-orange-500/[0.05]',border:'border-orange-500/20',text:'text-orange-400',label:'3rd', emoji: '🥉' },
            ][i]
            return (
              <div key={e.id} className={`${cfg.bg} border ${cfg.border} rounded-xl flex flex-col items-center justify-end pb-4 ${cfg.h} relative overflow-hidden`}>
                <div className="text-base font-black mb-0.5">{cfg.emoji}</div>
                <div className="text-xs font-bold truncate px-2">{e.name}</div>
                <div className={`text-[11px] font-mono font-bold ${cfg.text}`}>{e.points}pts</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Loading podium skeleton */}
      {loading && (
        <div className="hidden sm:grid grid-cols-3 gap-3 mb-5">
          {[0,1,2].map(i => <div key={i} className={`skeleton rounded-xl ${i===1?'h-28':'h-16'}`} />)}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden fade-up-3">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-3">
            <Spinner size={18} />
            <span className="text-sm font-mono text-muted">Fetching rankings...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-mono text-muted">No data yet</p>
          </div>
        ) : (
          <LeaderboardTable entries={entries} currentUserId={user?.id} />
        )}
      </div>

      <p className="text-[10px] font-mono text-muted mt-3 text-right">
        Auto-syncs from LeetCode every 5 min
      </p>
    </AppShell>
  )
}
