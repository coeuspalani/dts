'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface LiveEntry {
  rank: number
  name: string
  points: number
}

export default function LoginPage() {
  const router = useRouter()
  const { login, register } = useAuth()
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ name: '', email: '', password: '', leetcode_username: '' })
  const [liveData, setLiveData] = useState<{ entries: LiveEntry[]; challenge: string; daysLeft: string } | null>(null)

  // Fetch real leaderboard + active challenge
  useEffect(() => {
    async function fetchLive() {
      try {
        const [lbRes, challengeRes] = await Promise.all([
          fetch('/api/leaderboard?limit=5'),
          fetch('/api/challenges?status=active'),
        ])
        const lb        = await lbRes.json()
        const challenge = await challengeRes.json()

        const entries: LiveEntry[] = (lb.data?.entries ?? []).map((e: any) => ({
          rank:   e.rank,
          name:   e.name,
          points: e.points,
        }))

        let challengeTitle = 'No active challenge'
        let daysLeft       = ''
        if (Array.isArray(challenge.data) && challenge.data.length > 0) {
          const c    = challenge.data[0]
          challengeTitle = c.title
          const diff = new Date(c.end_date).getTime() - Date.now()
          const days = Math.ceil(diff / 86400000)
          daysLeft   = days > 0 ? `${days} day${days !== 1 ? 's' : ''} left` : 'Ending today'
        }

        setLiveData({ entries, challenge: challengeTitle, daysLeft })
      } catch {}
    }
    fetchLive()
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          leetcode_username: form.leetcode_username,
        })
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Skeleton rows while loading
  const skeletonRows = [1,2,3,4,5]

  return (
    <div className="min-h-screen bg-bg flex">
      {/* ── Left — form ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-10 max-w-md">
        <div className="mb-8">
          <div className="text-4xl font-black tracking-tight mb-1">
            D<span className="text-accent">T</span>S
          </div>
          <div className="text-[11px] font-mono text-muted tracking-widest">// DARE TO SOLVE</div>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-2 mb-8 bg-surface2 p-1 rounded-lg">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md capitalize transition-all
                ${mode === m ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Full Name</label>
              <input value={form.name} onChange={set('name')} placeholder="Palani Kumar"
                className="w-full px-4 py-2.5 text-sm font-mono" required />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com"
              className="w-full px-4 py-2.5 text-sm font-mono" required />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm font-mono" required />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">LeetCode Username</label>
              <input value={form.leetcode_username} onChange={set('leetcode_username')} placeholder="your_lc_username"
                className="w-full px-4 py-2.5 text-sm font-mono" required />
              <p className="text-[10px] font-mono text-muted mt-1.5">We verify this against LeetCode instantly.</p>
            </div>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger font-mono">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-white font-bold rounded-lg hover:opacity-85 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
            {loading
              ? (mode === 'register' ? 'Verifying LeetCode...' : 'Signing in...')
              : (mode === 'login' ? 'Enter the Arena →' : 'Join DTS →')
            }
          </button>
        </form>
      </div>

      {/* ── Right — LIVE leaderboard ─────────────────────────────── */}
      <div className="hidden lg:flex flex-1 bg-surface border-l border-white/[0.07] flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent2/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-xs relative">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// live leaderboard</div>
            {liveData && (
              <div className="w-2 h-2 rounded-full bg-accent2 animate-pulse" title="Live" />
            )}
          </div>

          {/* Rows */}
          {liveData
            ? liveData.entries.length > 0
              ? liveData.entries.map(({ rank, name, points }) => (
                  <div key={rank} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 mb-2">
                    <span className={`font-mono text-xs font-bold w-4 text-center ${rank === 1 ? 'text-gold' : 'text-muted'}`}>
                      {rank}
                    </span>
                    <span className="flex-1 text-sm font-semibold truncate">{name}</span>
                    <span className="text-xs font-mono text-accent2">{points} pts</span>
                  </div>
                ))
              : (
                <div className="text-center py-8">
                  <p className="text-sm font-mono text-muted">No competitors yet</p>
                  <p className="text-xs font-mono text-muted mt-1">Be the first to join!</p>
                </div>
              )
            : skeletonRows.map(i => (
                <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 mb-2 animate-pulse2">
                  <div className="w-4 h-3 bg-white/10 rounded" />
                  <div className="flex-1 h-3 bg-white/10 rounded" />
                  <div className="w-12 h-3 bg-white/10 rounded" />
                </div>
              ))
          }

          {/* Active challenge card */}
          <div className="mt-6 bg-accent/5 border border-accent/15 rounded-xl p-4 text-center">
            <div className="text-xs font-mono text-muted mb-1">current challenge</div>
            {liveData
              ? <>
                  <div className="text-sm font-bold text-accent">{liveData.challenge}</div>
                  {liveData.daysLeft && (
                    <div className="text-[10px] font-mono text-muted mt-1">{liveData.daysLeft}</div>
                  )}
                </>
              : <div className="h-4 bg-white/10 rounded animate-pulse2 mx-auto w-40" />
            }
          </div>
        </div>
      </div>
    </div>
  )
}