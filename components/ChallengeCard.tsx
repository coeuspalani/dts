'use client'
import type { Challenge } from '@/lib/types'
import CountdownTimer from './CountdownTimer'
import Spinner from './Spinner'
import clsx from 'clsx'
import { useState } from 'react'

interface Props {
  challenge:  Challenge
  onJoin?:    () => Promise<void>
  joined?:    boolean
  loading?:   boolean
}

const statusStyle: Record<string, string> = {
  active:    'bg-accent2/10 text-accent2 border-accent2/20',
  upcoming:  'bg-accent/10  text-accent  border-accent/20',
  paused:    'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  completed: 'bg-white/5 text-muted border-white/10',
}

export default function ChallengeCard({ challenge, onJoin, joined, loading }: Props) {
  const [joining, setJoining] = useState(false)

  const start    = new Date(challenge.start_date)
  const end      = new Date(challenge.end_date)
  const now      = new Date()
  const total    = end.getTime() - start.getTime()
  const elapsed  = Math.max(0, now.getTime() - start.getTime())
  const progress = Math.min(100, Math.round((elapsed / total) * 100))

  const handleJoin = async () => {
    if (!onJoin) return
    setJoining(true)
    try { await onJoin() } finally { setJoining(false) }
  }

  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-4 sm:p-5 h-full">
      <span className={clsx('inline-block text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border mb-3', statusStyle[challenge.status])}>
        {challenge.status === 'active' ? '● ' : ''}{challenge.status}
      </span>

      <h3 className="text-base sm:text-lg font-bold mb-1 leading-snug">{challenge.title}</h3>
      <p className="text-[10px] font-mono text-muted mb-4">
        {start.toLocaleDateString('en-IN', { day:'numeric', month:'short' })} →{' '}
        {end.toLocaleDateString('en-IN',   { day:'numeric', month:'short' })} · {challenge.duration_days}d
      </p>

      {challenge.status === 'active' && (
        <>
          <div className="bg-white/[0.06] rounded-full h-1.5 overflow-hidden mb-1.5">
            <div className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted mb-3">
            <span>Day {Math.max(1, Math.ceil(elapsed / 86400000))} of {challenge.duration_days}</span>
            <span>{progress}%</span>
          </div>
          <CountdownTimer endDate={challenge.end_date} />
        </>
      )}

      {onJoin && challenge.status === 'active' && (
        <div className="mt-4">
          {joined ? (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent2/10 border border-accent2/20">
              <div className="w-1.5 h-1.5 rounded-full bg-accent2 pulse-dot" />
              <span className="text-xs font-mono text-accent2">Participating</span>
            </div>
          ) : (
            <button onClick={handleJoin} disabled={joining}
              className="w-full py-2.5 bg-accent text-white text-sm font-bold rounded-lg hover:opacity-85 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {joining ? <><Spinner size={14} color="#fff" /> Joining...</> : 'Join Challenge →'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
