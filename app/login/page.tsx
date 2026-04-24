'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Spinner from '@/components/Spinner'
import { PageLoader } from '@/components/Spinner'

interface LiveEntry { rank: number; name: string; points: number }

export default function LoginPage() {
  const router                = useRouter()
  const { login, register, user, loading } = useAuth()
  const [mode, setMode]       = useState<'login'|'register'>('login')

  // Already logged in → go straight to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  // Show loader while checking auth state
  if (loading) return <PageLoader label="Checking session..." />
  // If user exists, redirect is in progress — show nothing to avoid flash
  if (user) return null
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [form, setForm]             = useState({ name:'', email:'', password:'', leetcode_username:'' })
  const [liveData, setLiveData]     = useState<{ entries: LiveEntry[]; challenge: string; daysLeft: string }|null>(null)

  useEffect(() => {
    async function fetchLive() {
      try {
        const [lbRes, challengeRes] = await Promise.all([
          fetch('/api/leaderboard?limit=5'),
          fetch('/api/challenges?status=active'),
        ])
        const lb        = await lbRes.json()
        const challenge = await challengeRes.json()
        const entries   = (lb.data?.entries ?? []).map((e: any) => ({ rank: e.rank, name: e.name, points: e.points }))
        let challengeTitle = 'No active challenge', daysLeft = ''
        if (Array.isArray(challenge.data) && challenge.data.length > 0) {
          const c    = challenge.data[0]
          challengeTitle = c.title
          const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
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
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register({ name: form.name, email: form.email, password: form.password, leetcode_username: form.leetcode_username })
      router.replace('/dashboard')
    } catch (err: any) { setError(err.message ?? 'Something went wrong') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col lg:flex-row">
      {/* ── Left — form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-10 lg:max-w-md w-full mx-auto lg:mx-0">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-4xl sm:text-5xl font-black tracking-tight mb-1">
            D<span className="text-accent">T</span>S
          </div>
          <div className="text-[11px] font-mono text-muted tracking-widest">// DARE TO SOLVE</div>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-2 mb-6 bg-surface2 p-1 rounded-xl">
          {(['login','register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all
                ${mode === m ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white'}`}>
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="fade-up">
              <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Full Name</label>
              <input value={form.name} onChange={set('name')} placeholder="Palani Kumar"
                className="w-full px-4 py-3 text-sm font-mono" required />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com"
              className="w-full px-4 py-3 text-sm font-mono" required />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••"
              className="w-full px-4 py-3 text-sm font-mono" required />
          </div>
          {mode === 'register' && (
            <div className="fade-up">
              <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">LeetCode Username</label>
              <input value={form.leetcode_username} onChange={set('leetcode_username')} placeholder="your_lc_username"
                className="w-full px-4 py-3 text-sm font-mono" required />
              <p className="text-[10px] font-mono text-muted mt-1.5 flex items-center gap-1">
                <span className="text-accent2">✓</span> Verified against LeetCode instantly
              </p>
            </div>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger font-mono flex items-start gap-2 fade-up">
              <span className="flex-shrink-0 mt-0.5">✕</span>{error}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 mt-2">
            {submitting
              ? <><Spinner size={16} color="#fff" />{mode === 'register' ? 'Verifying...' : 'Signing in...'}</>
              : mode === 'login' ? 'Enter the Arena →' : 'Join DTS →'
            }
          </button>
        </form>

        {/* Mobile leaderboard preview */}
        {liveData && liveData.entries.length > 0 && (
          <div className="lg:hidden mt-8 pt-6 border-t border-white/[0.07]">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              // live leaderboard <div className="w-1.5 h-1.5 rounded-full bg-accent2 pulse-dot" />
            </div>
            <div className="space-y-2">
              {liveData.entries.slice(0,3).map(({ rank, name, points }) => (
                <div key={rank} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
                  <span className={`font-mono text-xs font-bold w-4 text-center ${rank === 1 ? 'text-gold' : 'text-muted'}`}>{rank}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{name}</span>
                  <span className="text-xs font-mono text-accent2">{points}pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right — live leaderboard (desktop only) ── */}
      <div className="hidden lg:flex flex-1 bg-surface border-l border-white/[0.07] flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent2/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-xs relative">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// live leaderboard</div>
            {liveData && <div className="w-1.5 h-1.5 rounded-full bg-accent2 pulse-dot" title="Live" />}
          </div>

          {liveData
            ? liveData.entries.length > 0
              ? liveData.entries.map(({ rank, name, points }) => (
                  <div key={rank} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 mb-2 fade-up">
                    <span className={`font-mono text-xs font-bold w-4 text-center ${rank===1?'text-gold':'text-muted'}`}>{rank}</span>
                    <span className="flex-1 text-sm font-semibold truncate">{name}</span>
                    <span className="text-xs font-mono text-accent2">{points}pts</span>
                  </div>
                ))
              : <div className="text-center py-8"><p className="text-sm font-mono text-muted">Be the first to join!</p></div>
            : [1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3 mb-2">
                  <div className="skeleton h-3 w-4" />
                  <div className="skeleton h-3 flex-1" />
                  <div className="skeleton h-3 w-12" />
                </div>
              ))
          }

          <div className="mt-5 bg-accent/5 border border-accent/15 rounded-xl p-4 text-center">
            <div className="text-[10px] font-mono text-muted mb-1">current challenge</div>
            {liveData
              ? <><div className="text-sm font-bold text-accent">{liveData.challenge}</div>
                  {liveData.daysLeft && <div className="text-[10px] font-mono text-muted mt-1">{liveData.daysLeft}</div>}</>
              : <div className="skeleton h-4 w-40 mx-auto" />
            }
          </div>
        </div>
      </div>
    </div>
  )
}
