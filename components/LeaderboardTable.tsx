'use client'
import type { LeaderboardEntry } from '@/lib/types'
import clsx from 'clsx'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId?: string
  compact?: boolean
}

const rankStyle: Record<number, string> = {
  1: 'bg-gold/10 text-gold',
  2: 'bg-white/10 text-white/70',
  3: 'bg-orange-500/10 text-orange-400',
}

export default function LeaderboardTable({ entries, currentUserId, compact }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className="text-left py-3 px-4 text-[10px] font-mono text-muted uppercase tracking-widest">Rank</th>
            <th className="text-left py-3 px-4 text-[10px] font-mono text-muted uppercase tracking-widest">User</th>
            {!compact && <th className="text-left py-3 px-4 text-[10px] font-mono text-muted uppercase tracking-widest">LeetCode</th>}
            <th className="text-right py-3 px-4 text-[10px] font-mono text-muted uppercase tracking-widest">Solves</th>
            <th className="text-right py-3 px-4 text-[10px] font-mono text-muted uppercase tracking-widest">Points</th>
            {!compact && <th className="text-right py-3 px-4 text-[10px] font-mono text-muted uppercase tracking-widest">Change</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isMe = e.id === currentUserId
            const rs   = rankStyle[e.rank] ?? 'bg-white/[0.04] text-muted'
            return (
              <tr key={e.id} className={clsx('border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors', isMe && 'bg-accent/[0.05]')}>
                <td className="py-3 px-4">
                  <span className={clsx('inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold font-mono', rs)}>
                    {e.rank}
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold text-sm">
                  {e.name}
                  {isMe && <span className="ml-2 text-[9px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">you</span>}
                </td>
                {!compact && <td className="py-3 px-4 text-xs font-mono text-muted">{e.leetcode_username}</td>}
                <td className="py-3 px-4 text-right text-sm font-mono">{e.solve_count}</td>
                <td className="py-3 px-4 text-right text-sm font-mono font-bold text-accent2">{e.points}</td>
                {!compact && (
                  <td className="py-3 px-4 text-right">
                    <span className="text-xs font-mono text-muted">—</span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
