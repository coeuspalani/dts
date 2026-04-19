'use client'
import type { Challenge } from '@/lib/types'
import CountdownTimer from './CountdownTimer'
import clsx from 'clsx'

interface Props {
  challenge: Challenge
  onJoin?: () => void
  joined?: boolean
}

const statusStyle: Record<string, string> = {
  active:    'bg-accent2/10 text-accent2 border-accent2/20',
  upcoming:  'bg-accent/10 text-accent border-accent/20',
  paused:    'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  completed: 'bg-white/5 text-muted border-white/10',
}

export default function ChallengeCard({ challenge, onJoin, joined }: Props) {
  const start    = new Date(challenge.start_date)
  const end      = new Date(challenge.end_date)
  const now      = new Date()
  const total    = end.getTime() - start.getTime()
  const elapsed  = Math.max(0, now.getTime() - start.getTime())
  const progress = Math.min(100, Math.round((elapsed / total) * 100))

  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
      <span className={clsx('inline-block text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border mb-3', statusStyle[challenge.status])}>
        {challenge.status === 'active' ? '● ' : ''}{challenge.status}
      </span>

      <h3 className="text-base font-bold mb-1">{challenge.title}</h3>
      <p className="text-[11px] font-mono text-muted mb-4">
        {start.toLocaleDateString()} → {end.toLocaleDateString()} · {challenge.duration_days}d
      </p>

      {challenge.status === 'active' && (
        <>
          <div className="bg-white/[0.06] rounded-full h-1.5 overflow-hidden mb-1.5">
            <div className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted mb-3">
            <span>Day {Math.ceil(elapsed / 86400000)} of {challenge.duration_days}</span>
            <span>{progress}%</span>
          </div>
          <CountdownTimer endDate={challenge.end_date} />
        </>
      )}

      {onJoin && challenge.status === 'active' && !joined && (
        <button onClick={onJoin}
          className="mt-4 w-full py-2 bg-accent text-white text-sm font-bold rounded-lg hover:opacity-85 transition-opacity">
          Join Challenge
        </button>
      )}
      {joined && (
        <p className="mt-4 text-[11px] font-mono text-accent2 text-center">✓ Participating</p>
      )}
    </div>
  )
}
