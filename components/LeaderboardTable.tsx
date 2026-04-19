'use client'
import type { LeaderboardEntry } from '@/lib/types'
import { SkeletonRow } from './Spinner'
import clsx from 'clsx'

interface Props {
  entries:       LeaderboardEntry[]
  currentUserId?: string
  compact?:       boolean
  loading?:       boolean
}

const rankStyle: Record<number, string> = {
  1: 'bg-gold/10 text-gold border border-gold/20',
  2: 'bg-white/8 text-white/60 border border-white/10',
  3: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
}

export default function LeaderboardTable({ entries, currentUserId, compact, loading }: Props) {
  return (
    <div className="overflow-x-auto -mx-0">
      <table className="w-full min-w-[320px]">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className="text-left py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest w-10">#</th>
            <th className="text-left py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest">User</th>
            {!compact && <th className="text-left py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest hidden sm:table-cell">LeetCode</th>}
            <th className="text-right py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest hidden sm:table-cell">Solves</th>
            <th className="text-right py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest">Pts</th>
            {!compact && <th className="text-right py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest hidden md:table-cell">Δ</th>}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : entries.map((e) => {
                const isMe = e.id === currentUserId
                const rs   = rankStyle[e.rank] ?? 'bg-white/[0.04] text-muted border border-white/[0.05]'
                return (
                  <tr key={e.id} className={clsx(
                    'border-b border-white/[0.04] transition-colors',
                    isMe ? 'bg-accent/[0.05]' : 'hover:bg-white/[0.02]'
                  )}>
                    <td className="py-3 px-3 sm:px-4">
                      <span className={clsx('inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md text-[11px] font-bold font-mono', rs)}>
                        {e.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm truncate max-w-[100px] sm:max-w-none">{e.name}</span>
                        {isMe && <span className="text-[8px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">you</span>}
                      </div>
                    </td>
                    {!compact && <td className="py-3 px-3 sm:px-4 text-xs font-mono text-muted hidden sm:table-cell">{e.leetcode_username}</td>}
                    <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono hidden sm:table-cell">{e.solve_count}</td>
                    <td className="py-3 px-3 sm:px-4 text-right text-sm font-mono font-bold text-accent2">{e.points}</td>
                    {!compact && (
                      <td className="py-3 px-3 sm:px-4 text-right hidden md:table-cell">
                        <span className="text-xs font-mono text-muted">—</span>
                      </td>
                    )}
                  </tr>
                )
              })
          }
        </tbody>
      </table>
    </div>
  )
}
