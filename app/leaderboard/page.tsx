'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { getLeaderboard } from '@/lib/api-client'
import type { Challenge } from '@/lib/types'
import clsx from 'clsx'

interface Entry {
  rank: number; id?: string; user_id?: string; name: string
  leetcode_username: string; solve_count?: number; points?: number
  solves_in_challenge?: number; points_earned?: number
  easy_solved?: number; medium_solved?: number; hard_solved?: number
}

const rankStyles: Record<number, { bg: string; border: string; text: string; glow: string; label: string }> = {
  1: { bg:'bg-gradient-to-b from-gold/15 to-transparent', border:'border-gold/30', text:'text-gold', glow:'shadow-gold/20', label:'🥇' },
  2: { bg:'bg-gradient-to-b from-white/8 to-transparent',  border:'border-white/15', text:'text-white/70',   glow:'shadow-white/10', label:'🥈' },
  3: { bg:'bg-gradient-to-b from-orange-500/10 to-transparent', border:'border-orange-500/25', text:'text-orange-400', glow:'shadow-orange-400/15', label:'🥉' },
}

export default function LeaderboardPage() {
  const { user }                          = useAuth()
  const [entries, setEntries]             = useState<Entry[]>([])
  const [challenges, setChallenges]       = useState<Challenge[]>([])
  const [selectedChallenge, setSelected]  = useState('')
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [challengeMode, setChallengeMode] = useState(false)

  useEffect(() => {
    fetch('/api/challenges').then(r => r.json()).then(d => {
      setChallenges(d.data ?? [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getLeaderboard({ challenge_id: selectedChallenge || undefined, limit: 100 })
      .then(d => {
        setEntries(d.entries ?? [])
        setTotal(d.total ?? 0)
        setChallengeMode(!!selectedChallenge)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedChallenge])

  const myEntry = entries.find(e => (e.id ?? e.user_id) === user?.id)
  const myRank  = myEntry?.rank
  const top3    = entries.slice(0, 3)

  const getPoints  = (e: Entry) => challengeMode ? (e.points_earned ?? 0) : (e.points ?? 0)
  const getSolves  = (e: Entry) => challengeMode ? (e.solves_in_challenge ?? 0) : (e.solve_count ?? 0)
  const getUserId  = (e: Entry) => e.id ?? e.user_id ?? ''

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Leaderboard</h1>
          <p className="text-[10px] font-mono text-muted mt-0.5">
            {loading ? '// LOADING...' : `// ${total} COMPETITOR${total !== 1 ? 'S' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {myRank && (
            <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-2 text-center">
              <div className="text-[9px] font-mono text-muted uppercase tracking-widest">your rank</div>
              <div className="text-xl font-black text-gold">#{myRank}</div>
            </div>
          )}
          <select value={selectedChallenge} onChange={e => setSelected(e.target.value)}
            className="px-3 py-2.5 text-xs sm:text-sm font-mono rounded-lg min-w-[140px]">
            <option value="">🌍 Global</option>
            {challenges.map(c => (
              <option key={c.id} value={c.id}>
                {c.status === 'active' ? '● ' : ''}{c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Points legend */}
      <div className="flex gap-2 flex-wrap mb-5 fade-up-1">
        {[['Easy','1pt','text-accent2','border-accent2/20 bg-accent2/5'],
          ['Medium','2pts','text-gold','border-gold/20 bg-gold/5'],
          ['Hard','3pts','text-danger','border-danger/20 bg-danger/5']].map(([d,p,c,bg])=>(
          <div key={d} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${bg}`}>
            <span className={`font-bold ${c}`}>{d}</span><span className="text-muted">= {p}</span>
          </div>
        ))}
        {challengeMode && (
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/20 bg-accent/5 text-xs font-mono text-accent">
            <div className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot" /> Challenge Mode
          </div>
        )}
      </div>

      {/* Podium — top 3 */}
      {!loading && top3.length >= 3 && (
        <div className="mb-5 fade-up-2">
          {/* Podium: order is 2nd | 1st | 3rd */}
          <div className="flex items-end justify-center gap-2 sm:gap-3">
            {[
              { entry: top3[1], rank: 2, height: 'h-36', avatarSize: 'w-10 h-10', pts: 'text-xl', crown: null,   podiumLabel: '2nd' },
              { entry: top3[0], rank: 1, height: 'h-48', avatarSize: 'w-14 h-14', pts: 'text-3xl', crown: '👑',  podiumLabel: '1st' },
              { entry: top3[2], rank: 3, height: 'h-28', avatarSize: 'w-9 h-9',   pts: 'text-lg',  crown: null,  podiumLabel: '3rd' },
            ].map(({ entry, rank, height, avatarSize, pts: ptsCls, crown, podiumLabel }) => {
              const rs = rankStyles[rank]
              return (
                <div key={rank} className={`flex-1 max-w-[200px] flex flex-col items-center ${height} rounded-2xl border ${rs.border} relative`}
                  style={{ background: rank === 1 ? 'linear-gradient(to bottom, rgba(245,200,66,0.12), transparent)' : rank === 2 ? 'rgba(255,255,255,0.04)' : 'rgba(251,146,60,0.06)' }}>
                  {/* Avatar sits above card — use negative margin trick */}
                  <div className={`${avatarSize} rounded-full flex items-center justify-center font-black text-white flex-shrink-0 mt-4 relative z-10`}
                    style={{ background: rank === 1 ? 'rgba(245,200,66,0.2)' : rank === 2 ? 'rgba(255,255,255,0.1)' : 'rgba(251,146,60,0.15)', border: `1px solid ${rank === 1 ? 'rgba(245,200,66,0.4)' : rank === 2 ? 'rgba(255,255,255,0.15)' : 'rgba(251,146,60,0.3)'}` }}>
                    {crown
                      ? <span className="text-xl">{crown}</span>
                      : <span className={rank === 1 ? 'text-gold' : rank === 2 ? 'text-white/70' : 'text-orange-400'}>{entry.name[0]}</span>
                    }
                  </div>
                  <div className="flex flex-col items-center justify-end flex-1 pb-4 px-2 w-full">
                    <div className="text-[10px] font-mono text-white/30 mb-1">{podiumLabel}</div>
                    <div className="text-xs sm:text-sm font-bold truncate w-full text-center">{entry.name}</div>
                    <div className={`${ptsCls} font-black font-mono leading-none mt-1 ${rs.text}`}>{getPoints(entry)}</div>
                    <div className="text-[9px] font-mono text-muted">pts</div>
                    <div className="text-[9px] font-mono text-muted mt-0.5">{getSolves(entry)} solves</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skeleton podium */}
      {loading && (
        <div className="hidden sm:flex items-end justify-center gap-3 h-40 mb-5">
          {[75,100,60].map((h,i) => <div key={i} className="skeleton flex-1 max-w-[180px] rounded-2xl" style={{ height: `${h}%` }} />)}
        </div>
      )}

      {/* Full table */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden fade-up-3">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-3">
            <Spinner size={18} /><span className="text-sm font-mono text-muted">Fetching rankings...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-mono text-muted">No participants yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px]">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="text-left py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest w-10">#</th>
                  <th className="text-left py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest">User</th>
                  <th className="text-left py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest hidden sm:table-cell">LeetCode</th>
                  <th className="text-right py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest hidden sm:table-cell">
                    {challengeMode ? 'Solves' : 'Total'}
                  </th>
                  <th className="text-right py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest">
                    {challengeMode ? 'Challenge Pts' : 'Points'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const isMe  = getUserId(e) === user?.id
                  const rs    = rankStyles[e.rank]
                  const rankCls = rs
                    ? `${rs.text} ${rs.border} border`
                    : 'text-muted bg-white/[0.03] border border-white/[0.05]'
                  return (
                    <tr key={getUserId(e)} className={clsx('border-b border-white/[0.04] transition-colors', isMe ? 'bg-accent/[0.05]' : 'hover:bg-white/[0.02]')}>
                      <td className="py-3 px-3 sm:px-4">
                        <span className={clsx('inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md text-[11px] font-bold font-mono bg-white/[0.03]', rankCls)}>
                          {e.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate max-w-[100px] sm:max-w-none">{e.name}</span>
                          {isMe && <span className="text-[8px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">you</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-xs font-mono text-muted hidden sm:table-cell">{e.leetcode_username}</td>
                      <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono hidden sm:table-cell">{getSolves(e)}</td>
                      <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono font-bold text-accent2">{getPoints(e)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] font-mono text-muted mt-3 text-right">Auto-syncs from LeetCode every 5 min</p>
    </AppShell>
  )
}
